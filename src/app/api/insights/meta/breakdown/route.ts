import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma-project/client";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { resolveProject } from "@/lib/insights/projectResolve";
import { MetaBreakdownDailyRow, LenientEnvelope, parseRowsLenient } from "@/lib/insights/schemas";

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
  const { valid: rows, skipped, errorSamples } = parseRowsLenient(MetaBreakdownDailyRow, env.data.rows);

  let upserted = 0;
  await ctx.client.$transaction(async (tx) => {
    for (const r of rows) {
      const dimMeta =
        r.dim_meta == null ? Prisma.DbNull : (r.dim_meta as Prisma.InputJsonValue);
      await tx.metaBreakdownDaily.upsert({
        where: {
          tenantId_accountId_date_breakdownType_dim1_dim2: {
            tenantId: ctx.tenantId,
            accountId: r.account_id,
            date: r.date,
            breakdownType: r.breakdown_type,
            dim1: r.dim1,
            dim2: r.dim2,
          },
        },
        update: {
          accountName: r.account_name,
          dimMeta,
          impressions: r.impressions,
          clicksAll: r.clicks_all,
          spend: r.spend,
          purchases: r.purchases,
          purchaseConvValue: r.purchase_conv_value,
          roas: r.roas ?? null,
          fetchedAt: new Date(),
        },
        create: {
          tenantId: ctx.tenantId,
          accountId: r.account_id,
          accountName: r.account_name,
          date: r.date,
          breakdownType: r.breakdown_type,
          dim1: r.dim1,
          dim2: r.dim2,
          dimMeta,
          impressions: r.impressions,
          clicksAll: r.clicks_all,
          spend: r.spend,
          purchases: r.purchases,
          purchaseConvValue: r.purchase_conv_value,
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
