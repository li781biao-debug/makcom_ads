import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { MetaCampaignDailyEnvelope } from "@/lib/insights/schemas";

export async function POST(req: Request) {
  const unauthorized = verifyMakeSecret(req);
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);
  const parsed = MetaCampaignDailyEnvelope.safeParse(json);
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
      await tx.metaCampaignDaily.upsert({
        where: {
          tenantId_date_campaignId: {
            tenantId: tenant_id,
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
          spend: r.spend,
          purchases: r.purchases,
          purchaseConvValue: r.purchase_conv_value,
          addsToCart: r.adds_to_cart,
          initiatedCheckouts: r.initiated_checkouts,
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
          accountName: r.account_name ?? null,
          campaignId: r.campaign_id,
          campaignName: r.campaign_name,
          campaignObjective: r.campaign_objective ?? null,
          impressions: r.impressions,
          clicksAll: r.clicks_all,
          spend: r.spend,
          purchases: r.purchases,
          purchaseConvValue: r.purchase_conv_value,
          addsToCart: r.adds_to_cart,
          initiatedCheckouts: r.initiated_checkouts,
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
