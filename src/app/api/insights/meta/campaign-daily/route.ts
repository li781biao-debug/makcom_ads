import { NextResponse } from "next/server";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { resolveProject } from "@/lib/insights/projectResolve";
import { MetaCampaignDailyRow, LenientEnvelope, parseRowsLenient } from "@/lib/insights/schemas";
import { makeFxLookup, mulMoney, mulMoneyOpt } from "@/lib/insights/fx";

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
  const { valid: rows, skipped, errorSamples } = parseRowsLenient(MetaCampaignDailyRow, env.data.rows);

  const fx = makeFxLookup();
  let upserted = 0;
  await ctx.client.$transaction(async (tx) => {
    for (const r of rows) {
      const rate = await fx(r.currency);
      const spend = mulMoney(r.spend, rate);
      const purchaseConvValue = mulMoney(r.purchase_conv_value, rate);
      const cpm = mulMoneyOpt(r.cpm, rate);
      const cpcAll = mulMoneyOpt(r.cpc_all, rate);
      await tx.metaCampaignDaily.upsert({
        where: {
          tenantId_date_campaignId: {
            tenantId: ctx.tenantId,
            date: r.date,
            campaignId: r.campaign_id,
          },
        },
        update: {
          accountId: r.account_id,
          accountName: r.account_name ?? null,
          campaignName: r.campaign_name,
          campaignObjective: r.campaign_objective ?? null,
          impressions: r.impressions,
          clicksAll: r.clicks_all,
          spend,
          purchases: r.purchases,
          purchaseConvValue,
          addsToCart: r.adds_to_cart,
          initiatedCheckouts: r.initiated_checkouts,
          cpm,
          cpcAll,
          ctrAll: r.ctr_all ?? null,
          roas: r.roas ?? null,
          fetchedAt: new Date(),
        },
        create: {
          tenantId: ctx.tenantId,
          date: r.date,
          accountId: r.account_id,
          accountName: r.account_name ?? null,
          campaignId: r.campaign_id,
          campaignName: r.campaign_name,
          campaignObjective: r.campaign_objective ?? null,
          impressions: r.impressions,
          clicksAll: r.clicks_all,
          spend,
          purchases: r.purchases,
          purchaseConvValue,
          addsToCart: r.adds_to_cart,
          initiatedCheckouts: r.initiated_checkouts,
          cpm,
          cpcAll,
          ctrAll: r.ctr_all ?? null,
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
