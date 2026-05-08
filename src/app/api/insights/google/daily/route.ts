import { NextResponse } from "next/server";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { resolveProject } from "@/lib/insights/projectResolve";
import { GoogleDailyEnvelope } from "@/lib/insights/schemas";

export async function POST(req: Request) {
  const unauthorized = verifyMakeSecret(req);
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);
  const parsed = GoogleDailyEnvelope.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_BODY", message: parsed.error.message } },
      { status: 400 },
    );
  }
  const ctx = await resolveProject(parsed.data);
  if (ctx instanceof NextResponse) return ctx;
  const { rows } = parsed.data;

  let upserted = 0;
  await ctx.client.$transaction(async (tx) => {
    for (const r of rows) {
      await tx.googleDailyMetric.upsert({
        where: { tenantId_date: { tenantId: ctx.tenantId, date: r.date } },
        update: {
          impressions: r.impressions,
          clicks: r.clicks,
          cost: r.cost,
          totalConvValue: r.total_conv_value,
          purchases: r.purchases,
          addsToCart: r.adds_to_cart,
          beginsCheckout: r.begins_checkout,
          avgCpc: r.avg_cpc ?? null,
          ctr: r.ctr ?? null,
          fetchedAt: new Date(),
        },
        create: {
          tenantId: ctx.tenantId,
          date: r.date,
          impressions: r.impressions,
          clicks: r.clicks,
          cost: r.cost,
          totalConvValue: r.total_conv_value,
          purchases: r.purchases,
          addsToCart: r.adds_to_cart,
          beginsCheckout: r.begins_checkout,
          avgCpc: r.avg_cpc ?? null,
          ctr: r.ctr ?? null,
        },
      });
      upserted++;
    }
  });

  return NextResponse.json({ ok: true, data: { upserted } });
}
