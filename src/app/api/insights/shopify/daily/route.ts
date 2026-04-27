import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { ShopifyDailyEnvelope } from "@/lib/insights/schemas";

export async function POST(req: Request) {
  const unauthorized = verifyMakeSecret(req);
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);
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
