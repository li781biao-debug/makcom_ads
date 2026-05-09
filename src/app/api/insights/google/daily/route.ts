import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma-project/client";
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

  // Group rows by date. Google's API forbids mixing
  // `segments.conversion_action_category` with traffic metrics in one GAQL,
  // so Make typically runs two queries and either concatenates results or
  // posts them separately. We classify each request:
  //   - traffic-only (no row has category)        → update only impressions/clicks/cost
  //   - conversion-only (every row has category)  → update only purchases/...
  //   - mixed                                     → update everything
  // Upsert preserves untouched fields, so two separate Make scenarios can
  // safely write into the same date row without clobbering each other.
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
      const hasTrafficRow = group.some(
        (g) => g.conversion_action_category == null,
      );
      // Detect rows that carry "legacy direct conversion fields" — i.e. raw
      // purchases / adds_to_cart / conversions / total_conv_value at top level.
      // Without this gate, a pure traffic-only request (no category, no direct
      // conversion fields) would otherwise resolve purchases=0 and clobber
      // existing values.
      const hasLegacyConvFields =
        !hasCategory &&
        group.some(
          (g) =>
            g.purchases != null ||
            g.adds_to_cart != null ||
            g.begins_checkout != null ||
            g.total_conv_value != null ||
            g.conversions != null ||
            g.conversions_value != null,
        );
      const updateTraffic = hasTrafficRow;
      const updateConversions = hasCategory || hasLegacyConvFields;

      // Traffic row: prefer one with non-zero impressions, else any uncategorized row.
      const trafficRow =
        group.find(
          (g) => g.conversion_action_category == null && g.impressions > BigInt(0),
        ) ?? group.find((g) => g.conversion_action_category == null);

      let purchases = 0;
      let addsToCart = 0;
      let beginsCheckout = 0;
      let totalConvValue = "0";

      if (hasCategory) {
        // Accumulate as floats — Google's conversions are fractional. Round
        // only at the end so we match Looker Studio (rather than summing
        // floor() per row which under-counts by up to N for N rows).
        let valueSum = 0;
        let purchasesF = 0;
        let addsToCartF = 0;
        let beginsCheckoutF = 0;
        for (const g of group) {
          if (g.conversion_action_category == null) continue;
          const conv = Number(g.conversions ?? 0);
          valueSum += Number(g.conversions_value ?? 0);
          switch (g.conversion_action_category) {
            case "PURCHASE":
              purchasesF += conv;
              break;
            case "ADD_TO_CART":
              addsToCartF += conv;
              break;
            case "BEGIN_CHECKOUT":
              beginsCheckoutF += conv;
              break;
            // Other categories (LEAD, SIGNUP, PAGE_VIEW, etc.) still contribute
            // to totalConvValue but aren't surfaced as KPIs.
          }
        }
        purchases = Math.round(purchasesF);
        addsToCart = Math.round(addsToCartF);
        beginsCheckout = Math.round(beginsCheckoutF);
        totalConvValue = String(valueSum);
      } else if (hasLegacyConvFields) {
        // Legacy single-payload path: row carries direct purchases/adds_to_cart.
        purchases =
          first.purchases ??
          (first.conversions != null ? Math.floor(Number(first.conversions)) : 0);
        addsToCart = first.adds_to_cart ?? 0;
        beginsCheckout = first.begins_checkout ?? 0;
        totalConvValue =
          first.total_conv_value ?? first.conversions_value ?? "0";
      }

      const update: Prisma.GoogleDailyMetricUncheckedUpdateInput = {
        fetchedAt: new Date(),
      };
      if (updateTraffic && trafficRow) {
        update.impressions = trafficRow.impressions;
        update.clicks = trafficRow.clicks;
        update.cost = trafficRow.cost;
        update.avgCpc = trafficRow.avg_cpc ?? null;
        update.ctr = trafficRow.ctr ?? null;
      }
      if (updateConversions) {
        update.totalConvValue = totalConvValue;
        update.purchases = purchases;
        update.addsToCart = addsToCart;
        update.beginsCheckout = beginsCheckout;
      }

      await tx.googleDailyMetric.upsert({
        where: { tenantId_date: { tenantId: ctx.tenantId, date: first.date } },
        update,
        create: {
          tenantId: ctx.tenantId,
          date: first.date,
          impressions: trafficRow?.impressions ?? BigInt(0),
          clicks: trafficRow?.clicks ?? BigInt(0),
          cost: trafficRow?.cost ?? "0",
          avgCpc: trafficRow?.avg_cpc ?? null,
          ctr: trafficRow?.ctr ?? null,
          totalConvValue: updateConversions ? totalConvValue : "0",
          purchases: updateConversions ? purchases : 0,
          addsToCart: updateConversions ? addsToCart : 0,
          beginsCheckout: updateConversions ? beginsCheckout : 0,
        },
      });
      upserted++;
    }
  });

  return NextResponse.json({ ok: true, data: { upserted } });
}
