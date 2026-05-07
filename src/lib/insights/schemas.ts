import { z } from "zod";

const decimalLike = z.union([z.number(), z.string()]).transform((v) => String(v));
const intLike = z.union([z.number(), z.string()]).transform((v) => Math.trunc(Number(v)));
const bigintLike = z.union([z.number(), z.string()]).transform((v) => BigInt(String(v).split(".")[0]));
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}/, "expected YYYY-MM-DD")
  .transform((s) => new Date(s.slice(0, 10) + "T00:00:00Z"));

const RowEnvelope = <T extends z.ZodTypeAny>(row: T) =>
  z.object({
    tenant_id: z.string().min(1),
    rows: z.array(row).min(1).max(2000),
  });

// Meta API actions[] / action_values[] item shape
const ActionItem = z.object({
  action_type: z.string(),
  value: z.union([z.string(), z.number()]).transform((v) => Number(v)),
});
type ActionItemT = z.infer<typeof ActionItem>;

function findActionValue(arr: ActionItemT[] | null | undefined, type: string): number | undefined {
  return arr?.find((a) => a.action_type === type)?.value;
}

// Meta returns CTR as a percentage (1.23 = 1.23%); we store as decimal (0.0123).
function normalizeCtr(v: string | null | undefined): string | null {
  if (v == null) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return n > 1 ? String(n / 100) : String(n);
}

// ---- Shopify (pre-aggregated rows) ----
export const ShopifyDailyRow = z.object({
  date: isoDate,
  total_sales: decimalLike,
  orders: intLike.optional().default(0),
  returns: intLike.optional().default(0),
  currency: z.string().min(1).max(8).optional().default("USD"),
});
export const ShopifyDailyEnvelope = RowEnvelope(ShopifyDailyRow);

// ---- Shopify (raw orders passthrough — backend aggregates by createdAt date) ----
// Accepts the GraphQL response shape from Shopify Search Orders module in Make.com.
// We extract just the fields we need; ignore the rest.
const ShopifyOrderRaw = z.object({
  id: z.string().optional(),
  createdAt: z.string().min(1),
  totalPriceSet: z.object({
    amount: z.union([z.string(), z.number()]).transform((v) => Number(v)),
    currencyCode: z.string().optional(),
  }),
});
export type ShopifyOrderRawT = z.infer<typeof ShopifyOrderRaw>;

export const ShopifyOrdersEnvelope = z.object({
  tenant_id: z.string().min(1),
  orders: z.array(ShopifyOrderRaw).max(5000),
});

// ---- Meta campaign daily ----
// Accepts BOTH our internal snake_case shape AND Make.com Facebook Insights module
// native output (actions[], action_values[], clicks, cpc, ctr, objective, date_start).
export const MetaCampaignDailyRow = z
  .object({
    date: isoDate.optional(),
    date_start: isoDate.optional(),
    account_id: z.string().min(1),
    account_name: z.string().optional().nullable(),
    campaign_id: z.string().min(1),
    campaign_name: z.string().min(1),
    campaign_objective: z.string().optional().nullable(),
    objective: z.string().optional().nullable(),
    impressions: bigintLike.nullish(),
    clicks: bigintLike.nullish(),
    clicks_all: bigintLike.nullish(),
    spend: decimalLike.nullish(),
    purchases: intLike.nullish(),
    purchase_conv_value: decimalLike.nullish(),
    adds_to_cart: intLike.nullish(),
    initiated_checkouts: intLike.nullish(),
    actions: z.array(ActionItem).nullish(),
    action_values: z.array(ActionItem).nullish(),
    cpm: decimalLike.optional().nullable(),
    cpc: decimalLike.optional().nullable(),
    cpc_all: decimalLike.optional().nullable(),
    ctr: decimalLike.optional().nullable(),
    ctr_all: decimalLike.optional().nullable(),
    roas: decimalLike.optional().nullable(),
  })
  .transform((r) => {
    const date = r.date ?? r.date_start;
    if (!date) throw new Error("date or date_start required");
    const purchases = r.purchases ?? findActionValue(r.actions, "omni_purchase") ?? 0;
    const purchaseConvValue =
      r.purchase_conv_value ?? String(findActionValue(r.action_values, "omni_purchase") ?? 0);
    const addsToCart = r.adds_to_cart ?? findActionValue(r.actions, "omni_add_to_cart") ?? 0;
    const initiatedCheckouts =
      r.initiated_checkouts ?? findActionValue(r.actions, "omni_initiated_checkout") ?? 0;
    const spend = r.spend ?? "0";
    const roas =
      r.roas ?? (Number(spend) > 0 ? String(Number(purchaseConvValue) / Number(spend)) : null);
    return {
      date,
      account_id: r.account_id,
      account_name: r.account_name ?? null,
      campaign_id: r.campaign_id,
      campaign_name: r.campaign_name,
      campaign_objective: r.campaign_objective ?? r.objective ?? null,
      impressions: r.impressions ?? BigInt(0),
      clicks_all: r.clicks_all ?? r.clicks ?? BigInt(0),
      spend,
      purchases,
      purchase_conv_value: purchaseConvValue,
      adds_to_cart: addsToCart,
      initiated_checkouts: initiatedCheckouts,
      cpm: r.cpm ?? null,
      cpc_all: r.cpc_all ?? r.cpc ?? null,
      ctr_all: normalizeCtr(r.ctr_all ?? r.ctr ?? null),
      roas,
    };
  });
export const MetaCampaignDailyEnvelope = RowEnvelope(MetaCampaignDailyRow);

// ---- Meta ad daily ----
export const MetaAdDailyRow = z
  .object({
    date: isoDate.optional(),
    date_start: isoDate.optional(),
    account_id: z.string().min(1),
    campaign_id: z.string().min(1),
    adset_id: z.string().min(1),
    adset_name: z.string().optional().nullable(),
    ad_id: z.string().min(1),
    ad_name: z.string().min(1),
    ad_creative_image_url: z.string().optional().nullable(),
    ad_body: z.string().optional().nullable(),
    impressions: bigintLike.nullish(),
    clicks: bigintLike.nullish(),
    clicks_all: bigintLike.nullish(),
    spend: decimalLike.nullish(),
    website_purchases: intLike.nullish(),
    purchase_conv_value: decimalLike.nullish(),
    actions: z.array(ActionItem).nullish(),
    action_values: z.array(ActionItem).nullish(),
    cpm: decimalLike.optional().nullable(),
    cpc: decimalLike.optional().nullable(),
    cpc_all: decimalLike.optional().nullable(),
    ctr: decimalLike.optional().nullable(),
    ctr_all: decimalLike.optional().nullable(),
    roas: decimalLike.optional().nullable(),
  })
  .transform((r) => {
    const date = r.date ?? r.date_start;
    if (!date) throw new Error("date or date_start required");
    const websitePurchases =
      r.website_purchases ??
      findActionValue(r.actions, "omni_purchase") ??
      findActionValue(r.actions, "purchase") ??
      0;
    const purchaseConvValue =
      r.purchase_conv_value ??
      String(
        findActionValue(r.action_values, "omni_purchase") ??
          findActionValue(r.action_values, "purchase") ??
          0,
      );
    const spend = r.spend ?? "0";
    const roas =
      r.roas ?? (Number(spend) > 0 ? String(Number(purchaseConvValue) / Number(spend)) : null);
    return {
      date,
      account_id: r.account_id,
      campaign_id: r.campaign_id,
      adset_id: r.adset_id,
      adset_name: r.adset_name ?? null,
      ad_id: r.ad_id,
      ad_name: r.ad_name,
      ad_creative_image_url: r.ad_creative_image_url ?? null,
      ad_body: r.ad_body ?? null,
      impressions: r.impressions ?? BigInt(0),
      clicks_all: r.clicks_all ?? r.clicks ?? BigInt(0),
      spend,
      website_purchases: websitePurchases,
      purchase_conv_value: purchaseConvValue,
      cpm: r.cpm ?? null,
      cpc_all: r.cpc_all ?? r.cpc ?? null,
      ctr_all: normalizeCtr(r.ctr_all ?? r.ctr ?? null),
      roas,
    };
  });
export const MetaAdDailyEnvelope = RowEnvelope(MetaAdDailyRow);

// ---- Meta breakdown daily ----
export const META_BREAKDOWN_TYPES = [
  "country",
  "publisher_platform",
  "promoted_object",
  "landing_page",
  "age_gender",
  "device_platform",
] as const;

export const MetaBreakdownDailyRow = z
  .object({
    date: isoDate.optional(),
    date_start: isoDate.optional(),
    breakdown_type: z.enum(META_BREAKDOWN_TYPES),
    dim1: z.string().min(1).max(255),
    dim2: z.string().max(128).optional().default(""),
    dim_meta: z.unknown().optional().nullable(),
    impressions: bigintLike.nullish(),
    clicks: bigintLike.nullish(),
    clicks_all: bigintLike.nullish(),
    spend: decimalLike.nullish(),
    purchases: intLike.nullish(),
    purchase_conv_value: decimalLike.nullish(),
    actions: z.array(ActionItem).nullish(),
    action_values: z.array(ActionItem).nullish(),
    roas: decimalLike.optional().nullable(),
  })
  .transform((r) => {
    const date = r.date ?? r.date_start;
    if (!date) throw new Error("date or date_start required");
    const purchases = r.purchases ?? findActionValue(r.actions, "omni_purchase") ?? 0;
    const purchaseConvValue =
      r.purchase_conv_value ?? String(findActionValue(r.action_values, "omni_purchase") ?? 0);
    const spend = r.spend ?? "0";
    const roas =
      r.roas ?? (Number(spend) > 0 ? String(Number(purchaseConvValue) / Number(spend)) : null);
    return {
      date,
      breakdown_type: r.breakdown_type,
      dim1: r.dim1,
      dim2: r.dim2,
      dim_meta: r.dim_meta,
      impressions: r.impressions ?? BigInt(0),
      clicks_all: r.clicks_all ?? r.clicks ?? BigInt(0),
      spend,
      purchases,
      purchase_conv_value: purchaseConvValue,
      roas,
    };
  });
export const MetaBreakdownDailyEnvelope = RowEnvelope(MetaBreakdownDailyRow);

// ---- Google daily ----
// Accepts THREE shapes:
//   (a) canonical flat: { date, cost, total_conv_value, ... }
//   (b) Google Ads native flat: { date, cost_micros, conversions_value, conversions, ... }
//   (c) Make.com camelCase nested: { date, metrics: { costMicros, conversionsValue, ... } }
// Backend handles all three transparently.
const numLike = z.union([z.number(), z.string()]);
const looseRecord = z.record(z.string(), z.unknown());

// Pick a metric value preferring snake_case (top-level), then nested camelCase, then nested snake.
function pickMetric(
  flat: number | string | null | undefined,
  nested: Record<string, unknown> | undefined,
  ...keys: string[]
): number | undefined {
  if (flat != null) return Number(flat);
  if (!nested) return undefined;
  for (const k of keys) {
    const v = nested[k];
    if (v != null) return Number(v as string | number);
  }
  return undefined;
}

export const GoogleDailyRow = z
  .object({
    date: isoDate,
    impressions: bigintLike.nullish(),
    clicks: bigintLike.nullish(),
    cost: decimalLike.nullish(),
    cost_micros: numLike.nullish(),
    total_conv_value: decimalLike.nullish(),
    conversions_value: numLike.nullish(),
    purchases: intLike.nullish(),
    conversions: numLike.nullish(),
    adds_to_cart: intLike.nullish(),
    begins_checkout: intLike.nullish(),
    avg_cpc: decimalLike.nullish(),
    average_cpc: numLike.nullish(),
    average_cpc_micros: numLike.nullish(),
    ctr: decimalLike.nullish(),
    metrics: looseRecord.nullish(),
  })
  .transform((r) => {
    const m = (r.metrics ?? {}) as Record<string, unknown>;
    const impressionsN = pickMetric(r.impressions as never, m, "impressions");
    const clicksN = pickMetric(r.clicks as never, m, "clicks");
    const costMicrosN = pickMetric(r.cost_micros, m, "costMicros", "cost_micros");
    const cost = r.cost ?? (costMicrosN != null ? String(costMicrosN / 1_000_000) : "0");
    const convValueN = pickMetric(r.conversions_value, m, "conversionsValue", "conversions_value");
    const totalConvValue = r.total_conv_value ?? (convValueN != null ? String(convValueN) : "0");
    const conversionsN = pickMetric(r.conversions, m, "conversions");
    const purchases = r.purchases ?? (conversionsN != null ? Math.floor(conversionsN) : 0);
    const cpcRawN = pickMetric(
      r.avg_cpc ?? r.average_cpc ?? r.average_cpc_micros,
      m,
      "averageCpc",
      "average_cpc",
    );
    const avgCpc =
      cpcRawN == null ? null : cpcRawN > 100 ? String(cpcRawN / 1_000_000) : String(cpcRawN);
    const ctrN = pickMetric(r.ctr, m, "ctr");
    return {
      date: r.date,
      impressions: BigInt(Math.trunc(impressionsN ?? 0)),
      clicks: BigInt(Math.trunc(clicksN ?? 0)),
      cost,
      total_conv_value: totalConvValue,
      purchases,
      adds_to_cart: r.adds_to_cart ?? 0,
      begins_checkout: r.begins_checkout ?? 0,
      avg_cpc: avgCpc,
      ctr: ctrN != null ? String(ctrN) : null,
    };
  });
export const GoogleDailyEnvelope = RowEnvelope(GoogleDailyRow);

// ---- Google campaign type daily ----
export const GoogleCampaignTypeRow = z
  .object({
    date: isoDate,
    campaign_type: z.string().optional(),
    clicks: bigintLike.nullish(),
    cost: decimalLike.nullish(),
    cost_micros: numLike.nullish(),
    purchases: intLike.nullish(),
    conversions: numLike.nullish(),
    total_conv_value: decimalLike.nullish(),
    conversions_value: numLike.nullish(),
    roas: decimalLike.optional().nullable(),
    metrics: looseRecord.nullish(),
    campaign: looseRecord.nullish(),
  })
  .transform((r) => {
    const c = (r.campaign ?? {}) as Record<string, unknown>;
    const m = (r.metrics ?? {}) as Record<string, unknown>;
    const campaignType =
      r.campaign_type ??
      (c.advertisingChannelType as string | undefined) ??
      (c.advertising_channel_type as string | undefined);
    if (!campaignType) throw new Error("campaign_type or campaign.advertisingChannelType required");
    const clicksN = pickMetric(r.clicks as never, m, "clicks");
    const costMicrosN = pickMetric(r.cost_micros, m, "costMicros", "cost_micros");
    const cost = r.cost ?? (costMicrosN != null ? String(costMicrosN / 1_000_000) : "0");
    const convValueN = pickMetric(r.conversions_value, m, "conversionsValue", "conversions_value");
    const totalConvValue = r.total_conv_value ?? (convValueN != null ? String(convValueN) : "0");
    const conversionsN = pickMetric(r.conversions, m, "conversions");
    const purchases = r.purchases ?? (conversionsN != null ? Math.floor(conversionsN) : 0);
    const roas =
      r.roas ?? (Number(cost) > 0 ? String(Number(totalConvValue) / Number(cost)) : null);
    return {
      date: r.date,
      campaign_type: campaignType,
      clicks: BigInt(Math.trunc(clicksN ?? 0)),
      cost,
      purchases,
      total_conv_value: totalConvValue,
      roas,
    };
  });
export const GoogleCampaignTypeEnvelope = RowEnvelope(GoogleCampaignTypeRow);

// ---- Google breakdown daily ----
export const GOOGLE_BREAKDOWN_TYPES = [
  "search_term_search",
  "search_term_shopping",
  "top_product_shopping",
  "final_url",
  "country",
  "conv_value_gender",
  "conv_value_age",
  "conv_value_device",
] as const;

export const GoogleBreakdownDailyRow = z
  .object({
    date: isoDate,
    breakdown_type: z.enum(GOOGLE_BREAKDOWN_TYPES),
    dim1: z.string().max(255).optional(),
    dim2: z.string().max(128).optional().default(""),
    dim_meta: z.unknown().optional().nullable(),
    clicks: bigintLike.nullish(),
    cost: decimalLike.nullish(),
    cost_micros: numLike.nullish(),
    purchases: intLike.nullish(),
    conversions: numLike.nullish(),
    total_conv_value: decimalLike.nullish(),
    conversions_value: numLike.nullish(),
    all_conv_value: decimalLike.nullish(),
    // Optional Google Ads native nested objects — backend extracts dim1/dim2 from them
    metrics: looseRecord.nullish(),
    segments: looseRecord.nullish(),
    campaign: looseRecord.nullish(),
    searchTermView: looseRecord.nullish(),
    adGroupAd: looseRecord.nullish(),
    adGroupCriterion: looseRecord.nullish(),
  })
  .transform((r) => {
    const m = (r.metrics ?? {}) as Record<string, unknown>;
    const seg = (r.segments ?? {}) as Record<string, unknown>;
    const camp = (r.campaign ?? {}) as Record<string, unknown>;
    const stv = (r.searchTermView ?? {}) as Record<string, unknown>;
    const aga = (r.adGroupAd ?? {}) as Record<string, unknown>;
    const agc = (r.adGroupCriterion ?? {}) as Record<string, unknown>;

    // Resolve dim1 — explicit beats auto-extract
    let dim1 = r.dim1;
    let dim2 = r.dim2 || "";
    if (!dim1 || dim1.length === 0) {
      switch (r.breakdown_type) {
        case "country":
          dim1 =
            (seg.geoTargetCountry as string) ?? (seg.geo_target_country as string) ?? "";
          break;
        case "search_term_search":
        case "search_term_shopping":
          dim1 = (stv.searchTerm as string) ?? (stv.search_term as string) ?? "";
          break;
        case "top_product_shopping":
          dim1 = (seg.productTitle as string) ?? (seg.product_title as string) ?? "";
          break;
        case "final_url": {
          const ad = aga.ad as Record<string, unknown> | undefined;
          const urls = (ad?.finalUrls as string[] | undefined) ??
            (ad?.final_urls as string[] | undefined);
          dim1 = urls && urls.length > 0 ? urls[0] : "";
          if (!dim2) {
            dim2 =
              (camp.advertisingChannelType as string) ??
              (camp.advertising_channel_type as string) ??
              "";
          }
          break;
        }
        case "conv_value_gender": {
          const g = agc.gender as Record<string, unknown> | undefined;
          dim1 = (g?.type as string) ?? "";
          break;
        }
        case "conv_value_age": {
          const a = (agc.ageRange as Record<string, unknown> | undefined) ??
            (agc.age_range as Record<string, unknown> | undefined);
          dim1 = (a?.type as string) ?? "";
          break;
        }
        case "conv_value_device":
          dim1 = (seg.device as string) ?? "";
          break;
      }
    }
    if (!dim1 || dim1.length === 0) dim1 = "(unknown)";

    const clicksN = pickMetric(r.clicks as never, m, "clicks");
    const costMicrosN = pickMetric(r.cost_micros, m, "costMicros", "cost_micros");
    const cost = r.cost ?? (costMicrosN != null ? String(costMicrosN / 1_000_000) : "0");
    const convValueN = pickMetric(r.conversions_value, m, "conversionsValue", "conversions_value");
    const totalConvValue = r.total_conv_value ?? (convValueN != null ? String(convValueN) : "0");
    const conversionsN = pickMetric(r.conversions, m, "conversions");
    const purchases = r.purchases ?? (conversionsN != null ? Math.floor(conversionsN) : 0);

    return {
      date: r.date,
      breakdown_type: r.breakdown_type,
      dim1,
      dim2,
      dim_meta: r.dim_meta,
      clicks: BigInt(Math.trunc(clicksN ?? 0)),
      cost,
      purchases,
      total_conv_value: totalConvValue,
      all_conv_value: r.all_conv_value ?? null,
    };
  });
export const GoogleBreakdownDailyEnvelope = RowEnvelope(GoogleBreakdownDailyRow);
