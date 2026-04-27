import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { MetaAdDailyEnvelope } from "@/lib/insights/schemas";

export async function POST(req: Request) {
  const unauthorized = verifyMakeSecret(req);
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);
  const parsed = MetaAdDailyEnvelope.safeParse(json);
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
      await tx.metaAdDaily.upsert({
        where: {
          tenantId_date_adId: {
            tenantId: tenant_id,
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
          spend: r.spend,
          websitePurchases: r.website_purchases,
          purchaseConvValue: r.purchase_conv_value,
          cpm: r.cpm ?? null,
          cpcAll: r.cpc_all ?? null,
          ctrAll: r.ctr_all ?? null,
          roas: r.roas ?? null,
          fetchedAt: new Date(),
        },
        create: {
          tenantId: tenant_id,
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
          spend: r.spend,
          websitePurchases: r.website_purchases,
          purchaseConvValue: r.purchase_conv_value,
          cpm: r.cpm ?? null,
          cpcAll: r.cpc_all ?? null,
          ctrAll: r.ctr_all ?? null,
          roas: r.roas ?? null,
        },
      });
      upserted++;
    }
  });

  return NextResponse.json({ ok: true, data: { upserted } });
}
