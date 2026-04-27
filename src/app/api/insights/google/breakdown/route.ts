import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { GoogleBreakdownDailyEnvelope } from "@/lib/insights/schemas";

export async function POST(req: Request) {
  const unauthorized = verifyMakeSecret(req);
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);
  const parsed = GoogleBreakdownDailyEnvelope.safeParse(json);
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
      const dimMeta =
        r.dim_meta == null ? Prisma.DbNull : (r.dim_meta as Prisma.InputJsonValue);
      await tx.googleBreakdownDaily.upsert({
        where: {
          tenantId_date_breakdownType_dim1_dim2: {
            tenantId: tenant_id,
            date: r.date,
            breakdownType: r.breakdown_type,
            dim1: r.dim1,
            dim2: r.dim2,
          },
        },
        update: {
          dimMeta,
          clicks: r.clicks,
          cost: r.cost,
          purchases: r.purchases,
          totalConvValue: r.total_conv_value,
          allConvValue: r.all_conv_value ?? null,
          fetchedAt: new Date(),
        },
        create: {
          tenantId: tenant_id,
          date: r.date,
          breakdownType: r.breakdown_type,
          dim1: r.dim1,
          dim2: r.dim2,
          dimMeta,
          clicks: r.clicks,
          cost: r.cost,
          purchases: r.purchases,
          totalConvValue: r.total_conv_value,
          allConvValue: r.all_conv_value ?? null,
        },
      });
      upserted++;
    }
  });

  return NextResponse.json({ ok: true, data: { upserted } });
}
