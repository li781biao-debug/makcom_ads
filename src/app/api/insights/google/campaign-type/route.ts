import { NextResponse } from "next/server";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { resolveProject } from "@/lib/insights/projectResolve";
import { GoogleCampaignTypeRow, LenientEnvelope, parseRowsLenient } from "@/lib/insights/schemas";
import { makeFxLookup, mulMoney } from "@/lib/insights/fx";

export async function POST(req: Request) {
  const unauthorized = verifyMakeSecret(req);
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);
  const env = LenientEnvelope.safeParse(json);
  if (!env.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_BODY", message: env.error.message } },
      { status: 400 },
    );
  }
  const ctx = await resolveProject(env.data);
  if (ctx instanceof NextResponse) return ctx;
  const { valid: rows, skipped, errorSamples } = parseRowsLenient(GoogleCampaignTypeRow, env.data.rows);

  const fx = makeFxLookup();
  let upserted = 0;
  await ctx.client.$transaction(async (tx) => {
    for (const r of rows) {
      const rate = await fx(r.currency);
      const cost = mulMoney(r.cost, rate);
      const totalConvValue = mulMoney(r.total_conv_value, rate);
      await tx.googleCampaignTypeDaily.upsert({
        where: {
          tenantId_customerId_date_campaignType: {
            tenantId: ctx.tenantId,
            customerId: r.customer_id,
            date: r.date,
            campaignType: r.campaign_type,
          },
        },
        update: {
          customerName: r.customer_name,
          clicks: r.clicks,
          cost,
          purchases: r.purchases,
          totalConvValue,
          roas: r.roas ?? null,
          fetchedAt: new Date(),
        },
        create: {
          tenantId: ctx.tenantId,
          customerId: r.customer_id,
          customerName: r.customer_name,
          date: r.date,
          campaignType: r.campaign_type,
          clicks: r.clicks,
          cost,
          purchases: r.purchases,
          totalConvValue,
          roas: r.roas ?? null,
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
