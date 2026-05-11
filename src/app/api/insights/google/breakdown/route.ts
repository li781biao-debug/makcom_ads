import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma-project/client";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { resolveProject } from "@/lib/insights/projectResolve";
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
  const ctx = await resolveProject(parsed.data);
  if (ctx instanceof NextResponse) return ctx;
  const { rows } = parsed.data;

  let upserted = 0;
  await ctx.client.$transaction(async (tx) => {
    for (const r of rows) {
      const dimMeta =
        r.dim_meta == null ? Prisma.DbNull : (r.dim_meta as Prisma.InputJsonValue);
      await tx.googleBreakdownDaily.upsert({
        where: {
          tenantId_customerId_date_breakdownType_dim1_dim2: {
            tenantId: ctx.tenantId,
            customerId: r.customer_id,
            date: r.date,
            breakdownType: r.breakdown_type,
            dim1: r.dim1,
            dim2: r.dim2,
          },
        },
        update: {
          customerName: r.customer_name,
          dimMeta,
          clicks: r.clicks,
          cost: r.cost,
          purchases: r.purchases,
          totalConvValue: r.total_conv_value,
          allConvValue: r.all_conv_value ?? null,
          fetchedAt: new Date(),
        },
        create: {
          tenantId: ctx.tenantId,
          customerId: r.customer_id,
          customerName: r.customer_name,
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
