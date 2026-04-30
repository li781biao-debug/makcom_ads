import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyMakeSecret } from "@/lib/insights/auth";
import {
  ShopifyDailyEnvelope,
  ShopifyOrdersEnvelope,
  type ShopifyOrderRawT,
} from "@/lib/insights/schemas";

/**
 * Accepts two body shapes:
 * 1. Pre-aggregated rows: { tenant_id, rows: [{date, total_sales, orders, returns, currency}] }
 * 2. Raw orders passthrough: { tenant_id, orders: [{createdAt, totalPriceSet, ...}] }
 *
 * Make.com only needs to forward the Shopify response (shape 2) — no aggregation upstream.
 */
export async function POST(req: Request) {
  const unauthorized = verifyMakeSecret(req);
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);

  // Detect raw orders shape vs pre-aggregated rows shape
  if (json && Array.isArray((json as { orders?: unknown }).orders)) {
    const parsed = ShopifyOrdersEnvelope.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: { code: "INVALID_BODY", message: parsed.error.message } },
        { status: 400 },
      );
    }
    return handleRawOrders(parsed.data.tenant_id, parsed.data.orders);
  }

  const parsed = ShopifyDailyEnvelope.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_BODY", message: parsed.error.message } },
      { status: 400 },
    );
  }
  const { tenant_id, rows } = parsed.data;

  let upserted = 0;
  await prisma.$transaction(async (tx) => {
    for (const r of rows) {
      await tx.shopifyDailyMetric.upsert({
        where: { tenantId_date: { tenantId: tenant_id, date: r.date } },
        update: {
          totalSales: r.total_sales,
          orders: r.orders,
          returns: r.returns,
          currency: r.currency,
          fetchedAt: new Date(),
        },
        create: {
          tenantId: tenant_id,
          date: r.date,
          totalSales: r.total_sales,
          orders: r.orders,
          returns: r.returns,
          currency: r.currency,
        },
      });
      upserted++;
    }
  });

  return NextResponse.json({ ok: true, data: { upserted } });
}

async function handleRawOrders(tenantId: string, orders: ShopifyOrderRawT[]) {
  type Bucket = { totalSales: number; orders: number; currency: string };
  const byDate = new Map<string, Bucket>();
  for (const o of orders) {
    const date = o.createdAt.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const cur = byDate.get(date) ?? { totalSales: 0, orders: 0, currency: "USD" };
    cur.totalSales += Number(o.totalPriceSet.amount) || 0;
    cur.orders += 1;
    if (o.totalPriceSet.currencyCode) cur.currency = o.totalPriceSet.currencyCode;
    byDate.set(date, cur);
  }

  const days = Array.from(byDate.keys()).sort();
  let upserted = 0;
  await prisma.$transaction(async (tx) => {
    for (const dateStr of days) {
      const agg = byDate.get(dateStr)!;
      const date = new Date(dateStr + "T00:00:00Z");
      await tx.shopifyDailyMetric.upsert({
        where: { tenantId_date: { tenantId, date } },
        update: {
          totalSales: agg.totalSales.toFixed(2),
          orders: agg.orders,
          currency: agg.currency,
          fetchedAt: new Date(),
        },
        create: {
          tenantId,
          date,
          totalSales: agg.totalSales.toFixed(2),
          orders: agg.orders,
          returns: 0,
          currency: agg.currency,
        },
      });
      upserted++;
    }
  });

  return NextResponse.json({
    ok: true,
    data: { upserted, days, totalOrders: orders.length },
  });
}
