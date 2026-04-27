import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { GoogleCampaignTypeEnvelope } from "@/lib/insights/schemas";

export async function POST(req: Request) {
  const unauthorized = verifyMakeSecret(req);
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);
  const parsed = GoogleCampaignTypeEnvelope.safeParse(json);
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
      await tx.googleCampaignTypeDaily.upsert({
        where: {
          tenantId_date_campaignType: {
            tenantId: tenant_id,
            date: r.date,
            campaignType: r.campaign_type,
          },
        },
        update: {
          clicks: r.clicks,
          cost: r.cost,
          purchases: r.purchases,
          totalConvValue: r.total_conv_value,
          roas: r.roas ?? null,
          fetchedAt: new Date(),
        },
        create: {
          tenantId: tenant_id,
          date: r.date,
          campaignType: r.campaign_type,
          clicks: r.clicks,
          cost: r.cost,
          purchases: r.purchases,
          totalConvValue: r.total_conv_value,
          roas: r.roas ?? null,
        },
      });
      upserted++;
    }
  });

  return NextResponse.json({ ok: true, data: { upserted } });
}
