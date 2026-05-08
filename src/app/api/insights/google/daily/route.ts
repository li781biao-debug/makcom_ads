import { NextResponse } from "next/server";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { resolveProject } from "@/lib/insights/projectResolve";
import { GoogleDailyEnvelope } from "@/lib/insights/schemas";

export async function POST(req: Request) {
  const unauthorized = verifyMakeSecret(req);
  if (unauthorized) return unauthorized;

  const json = await req.json().catch(() => null);
  const parsed = GoogleDailyEnvelope.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: { code: "INVALID_BODY", message: parsed.error.message } },
      { status: 400 },
    );
  }
  const ctx = await resolveProject(parsed.data);
  if (ctx instanceof NextResponse) return ctx;
  const { rows } = parsed.data;

  // Group rows by date. When Make's GAQL includes
  // `segments.conversion_action_category`, Google returns one row per
  // (date, category) — we pivot them into a single GoogleDailyMetric record.
  type Row = (typeof rows)[number];
  const byDate = new Map<number, Row[]>();
  for (const r of rows) {
    const key = r.date.getTime();
    const arr = byDate.get(key);
    if (arr) arr.push(r);
    else byDate.set(key, [r]);
  }

  let upserted = 0;
  await ctx.client.$transaction(async (tx) => {
    for (const [, group] of byDate) {
      const first = group[0];
      const hasCategory = group.some((g) => g.conversion_action_category != null);

      let purchases = 0;
      let addsToCart = 0;
      let beginsCheckout = 0;
      let totalConvValue = "0";

      if (hasCategory) {
        // Category-segmented input: pivot conversions across rows for this date.
        let valueSum = 0;
        for (const g of group) {
          const conv = Math.floor(Number(g.conversions ?? 0));
          valueSum += Number(g.conversions_value ?? 0);
          switch (g.conversion_action_category) {
            case "PURCHASE":
              purchases += conv;
              break;
            case "ADD_TO_CART":
              addsToCart += conv;
              break;
            case "BEGIN_CHECKOUT":
              beginsCheckout += conv;
              break;
            // Other categories (LEAD, SIGNUP, PAGE_VIEW, etc.) contribute to
            // total_conv_value but are not surfaced as KPIs today.
          }
        }
        totalConvValue = String(valueSum);
      } else {
        // Legacy single-row input: use direct fields, falling back to raw conversions.
        purchases =
          first.purchases ??
          (first.conversions != null ? Math.floor(Number(first.conversions)) : 0);
        addsToCart = first.adds_to_cart ?? 0;
        beginsCheckout = first.begins_checkout ?? 0;
        totalConvValue =
          first.total_conv_value ?? first.conversions_value ?? "0";
      }

      await tx.googleDailyMetric.upsert({
        where: { tenantId_date: { tenantId: ctx.tenantId, date: first.date } },
        update: {
          impressions: first.impressions,
          clicks: first.clicks,
          cost: first.cost,
          totalConvValue,
          purchases,
          addsToCart,
          beginsCheckout,
          avgCpc: first.avg_cpc ?? null,
          ctr: first.ctr ?? null,
          fetchedAt: new Date(),
        },
        create: {
          tenantId: ctx.tenantId,
          date: first.date,
          impressions: first.impressions,
          clicks: first.clicks,
          cost: first.cost,
          totalConvValue,
          purchases,
          addsToCart,
          beginsCheckout,
          avgCpc: first.avg_cpc ?? null,
          ctr: first.ctr ?? null,
        },
      });
      upserted++;
    }
  });

  return NextResponse.json({ ok: true, data: { upserted } });
}
