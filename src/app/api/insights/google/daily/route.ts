import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma-project/client";
import { verifyMakeSecret } from "@/lib/insights/auth";
import { resolveProject } from "@/lib/insights/projectResolve";
import { GoogleDailyRow, LenientEnvelope, parseRowsLenient } from "@/lib/insights/schemas";
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
  const { valid: rows, skipped, errorSamples } = parseRowsLenient(GoogleDailyRow, env.data.rows);

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
  // Group by (customer_id, date) — each Google customer has its own daily row.
  const byKey = new Map<string, Row[]>();
  for (const r of rows) {
    const key = `${r.customer_id}|${r.date.getTime()}`;
    const arr = byKey.get(key);
    if (arr) arr.push(r);
    else byKey.set(key, [r]);
  }

  const fx = makeFxLookup();
  let upserted = 0;
  await ctx.client.$transaction(async (tx) => {
    for (const [, group] of byKey) {
      const first = group[0];
      const rate = await fx(first.currency);
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
        customerName: first.customer_name,
      };
      if (updateTraffic && trafficRow) {
        update.impressions = trafficRow.impressions;
        update.clicks = trafficRow.clicks;
        update.cost = mulMoney(trafficRow.cost, rate);
        update.avgCpc = mulMoneyOpt(trafficRow.avg_cpc, rate);
        update.ctr = trafficRow.ctr ?? null;
      }
      if (updateConversions) {
        update.totalConvValue = mulMoney(totalConvValue, rate);
        update.purchases = purchases;
        update.addsToCart = addsToCart;
        update.beginsCheckout = beginsCheckout;
      }

      await tx.googleDailyMetric.upsert({
        where: {
          tenantId_customerId_date: {
            tenantId: ctx.tenantId,
            customerId: first.customer_id,
            date: first.date,
          },
        },
        update,
        create: {
          tenantId: ctx.tenantId,
          customerId: first.customer_id,
          customerName: first.customer_name,
          date: first.date,
          impressions: trafficRow?.impressions ?? BigInt(0),
          clicks: trafficRow?.clicks ?? BigInt(0),
          cost: mulMoney(trafficRow?.cost ?? "0", rate),
          avgCpc: mulMoneyOpt(trafficRow?.avg_cpc ?? null, rate),
          ctr: trafficRow?.ctr ?? null,
          totalConvValue: updateConversions ? mulMoney(totalConvValue, rate) : "0",
          purchases: updateConversions ? purchases : 0,
          addsToCart: updateConversions ? addsToCart : 0,
          beginsCheckout: updateConversions ? beginsCheckout : 0,
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
