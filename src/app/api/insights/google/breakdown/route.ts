import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma-project/client";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { resolveProject } from "@/lib/insights/projectResolve";
import { GoogleBreakdownDailyRow, LenientEnvelope, parseRowsLenient } from "@/lib/insights/schemas";
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
  const { valid: rows, skipped, errorSamples } = parseRowsLenient(GoogleBreakdownDailyRow, env.data.rows);

  const fx = makeFxLookup();
  let upserted = 0;
  await ctx.client.$transaction(async (tx) => {
    for (const r of rows) {
      const dimMeta =
        r.dim_meta == null ? Prisma.DbNull : (r.dim_meta as Prisma.InputJsonValue);
      const rate = await fx(r.currency);
      const cost = mulMoney(r.cost, rate);
      const totalConvValue = mulMoney(r.total_conv_value, rate);
      const allConvValue = mulMoneyOpt(r.all_conv_value ?? null, rate);
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
          cost,
          purchases: r.purchases,
          totalConvValue,
          allConvValue,
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
          cost,
          purchases: r.purchases,
          totalConvValue,
          allConvValue,
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
