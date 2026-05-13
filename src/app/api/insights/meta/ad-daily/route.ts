import { NextResponse } from "next/server";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { resolveProject } from "@/lib/insights/projectResolve";
import { MetaAdDailyRow, LenientEnvelope, parseRowsLenient } from "@/lib/insights/schemas";
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
  const { valid: rows, skipped, errorSamples } = parseRowsLenient(MetaAdDailyRow, env.data.rows);

  const fx = makeFxLookup();
  let upserted = 0;
  await ctx.client.$transaction(async (tx) => {
    for (const r of rows) {
      const rate = await fx(r.currency);
      const spend = mulMoney(r.spend, rate);
      const purchaseConvValue = mulMoney(r.purchase_conv_value, rate);
      const cpm = mulMoneyOpt(r.cpm, rate);
      const cpcAll = mulMoneyOpt(r.cpc_all, rate);
      await tx.metaAdDaily.upsert({
        where: {
          tenantId_date_adId: {
            tenantId: ctx.tenantId,
            date: r.date,
            adId: r.ad_id,
          },
        },
        update: {
          accountId: r.account_id,
          campaignId: r.campaign_id,
          adsetId: r.adset_id,
          adsetName: r.adset_name ?? null,
          adName: r.ad_name,
          adCreativeImageUrl: r.ad_creative_image_url ?? null,
          adBody: r.ad_body ?? null,
          impressions: r.impressions,
          clicksAll: r.clicks_all,
          spend,
          websitePurchases: r.website_purchases,
          purchaseConvValue,
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
          campaignId: r.campaign_id,
          adsetId: r.adset_id,
          adsetName: r.adset_name ?? null,
          adId: r.ad_id,
          adName: r.ad_name,
          adCreativeImageUrl: r.ad_creative_image_url ?? null,
          adBody: r.ad_body ?? null,
          impressions: r.impressions,
          clicksAll: r.clicks_all,
          spend,
          websitePurchases: r.website_purchases,
          purchaseConvValue,
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
