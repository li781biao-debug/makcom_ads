import { NextResponse } from "next/server";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { resolveProject, type ProjectContext } from "@/lib/insights/projectResolve";
import {
  ShopifyDailyRow,
  ShopifyOrdersEnvelope,
  LenientEnvelope,
  parseRowsLenient,
  type ShopifyOrderRawT,
} from "@/lib/insights/schemas";
import { makeFxLookup, mulMoney } from "@/lib/insights/fx";

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
    const ctx = await resolveProject(parsed.data);
    if (ctx instanceof NextResponse) return ctx;
    return handleRawOrders(ctx, parsed.data.orders);
  }

  const env = LenientEnvelope.safeParse(json);
  if (!env.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_BODY", message: env.error.message } },
      { status: 400 },
    );
  }
  const ctx = await resolveProject(env.data);
  if (ctx instanceof NextResponse) return ctx;
  const { valid: rows, skipped, errorSamples } = parseRowsLenient(ShopifyDailyRow, env.data.rows);

  const fx = makeFxLookup();
  let upserted = 0;
  await ctx.client.$transaction(async (tx) => {
    for (const r of rows) {
      const rate = await fx(r.currency);
      const totalSalesUsd = mulMoney(r.total_sales, rate);
      await tx.shopifyDailyMetric.upsert({
        where: { tenantId_date: { tenantId: ctx.tenantId, date: r.date } },
        update: {
          totalSales: totalSalesUsd,
          orders: r.orders,
          returns: r.returns,
          currency: "USD",
          fetchedAt: new Date(),
        },
        create: {
          tenantId: ctx.tenantId,
          date: r.date,
          totalSales: totalSalesUsd,
          orders: r.orders,
          returns: r.returns,
          currency: "USD",
        },
      });
      upserted++;
    }
  });

  return NextResponse.json({
    ok: true,
    data: { upserted, skipped, ...(errorSamples.length ? { errorSamples } : {}) },
  });
}

async function handleRawOrders(ctx: ProjectContext, orders: ShopifyOrderRawT[]) {
  type Bucket = { totalSales: number; orders: number; currency: string };
  const byDate = new Map<string, Bucket>();
  let skipped = 0;
  for (const o of orders) {
    if (o.cancelledAt) {
      skipped++;
      continue;
    }
    if (o.displayFinancialStatus === "VOIDED" || o.displayFinancialStatus === "EXPIRED") {
      skipped++;
      continue;
    }
    const priceSet = o.currentTotalPriceSet ?? o.totalPriceSet;
    if (!priceSet) {
      skipped++;
      continue;
    }
    const date = o.createdAt.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const cur = byDate.get(date) ?? { totalSales: 0, orders: 0, currency: "USD" };
    cur.totalSales += Number(priceSet.amount) || 0;
    cur.orders += 1;
    if (priceSet.currencyCode) cur.currency = priceSet.currencyCode;
    byDate.set(date, cur);
  }

  const days = Array.from(byDate.keys()).sort();
  const fx = makeFxLookup();
  let upserted = 0;
  await ctx.client.$transaction(async (tx) => {
    for (const dateStr of days) {
      const agg = byDate.get(dateStr)!;
      const date = new Date(dateStr + "T00:00:00Z");
      const rate = await fx(agg.currency);
      const totalSalesUsd = (agg.totalSales * rate).toFixed(4);
      await tx.shopifyDailyMetric.upsert({
        where: { tenantId_date: { tenantId: ctx.tenantId, date } },
        update: {
          totalSales: totalSalesUsd,
          orders: agg.orders,
          currency: "USD",
          fetchedAt: new Date(),
        },
        create: {
          tenantId: ctx.tenantId,
          date,
          totalSales: totalSalesUsd,
          orders: agg.orders,
          returns: 0,
          currency: "USD",
        },
      });
      upserted++;
    }
  });

  return NextResponse.json({
    ok: true,
    data: { upserted, days, totalOrders: orders.length, skipped },
  });
}
