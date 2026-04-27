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

// ---- Shopify ----
export const ShopifyDailyRow = z.object({
  date: isoDate,
  total_sales: decimalLike,
  orders: intLike.optional().default(0),
  returns: intLike.optional().default(0),
  currency: z.string().min(1).max(8).optional().default("USD"),
});
export const ShopifyDailyEnvelope = RowEnvelope(ShopifyDailyRow);

// ---- Meta campaign daily ----
export const MetaCampaignDailyRow = z.object({
  date: isoDate,
  account_id: z.string().min(1),
  account_name: z.string().optional().nullable(),
  campaign_id: z.string().min(1),
  campaign_name: z.string().min(1),
  campaign_objective: z.string().optional().nullable(),
  impressions: bigintLike.optional().default(BigInt(0)),
  clicks_all: bigintLike.optional().default(BigInt(0)),
  spend: decimalLike.optional().default("0"),
  purchases: intLike.optional().default(0),
  purchase_conv_value: decimalLike.optional().default("0"),
  adds_to_cart: intLike.optional().default(0),
  initiated_checkouts: intLike.optional().default(0),
  cpm: decimalLike.optional().nullable(),
  cpc_all: decimalLike.optional().nullable(),
  ctr_all: decimalLike.optional().nullable(),
  roas: decimalLike.optional().nullable(),
});
export const MetaCampaignDailyEnvelope = RowEnvelope(MetaCampaignDailyRow);

// ---- Meta ad daily ----
export const MetaAdDailyRow = z.object({
  date: isoDate,
  account_id: z.string().min(1),
  campaign_id: z.string().min(1),
  adset_id: z.string().min(1),
  adset_name: z.string().optional().nullable(),
  ad_id: z.string().min(1),
  ad_name: z.string().min(1),
  ad_creative_image_url: z.string().optional().nullable(),
  ad_body: z.string().optional().nullable(),
  impressions: bigintLike.optional().default(BigInt(0)),
  clicks_all: bigintLike.optional().default(BigInt(0)),
  spend: decimalLike.optional().default("0"),
  website_purchases: intLike.optional().default(0),
  purchase_conv_value: decimalLike.optional().default("0"),
  cpm: decimalLike.optional().nullable(),
  cpc_all: decimalLike.optional().nullable(),
  ctr_all: decimalLike.optional().nullable(),
  roas: decimalLike.optional().nullable(),
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

export const MetaBreakdownDailyRow = z.object({
  date: isoDate,
  breakdown_type: z.enum(META_BREAKDOWN_TYPES),
  dim1: z.string().min(1).max(255),
  dim2: z.string().max(128).optional().default(""),
  dim_meta: z.unknown().optional().nullable(),
  impressions: bigintLike.optional().default(BigInt(0)),
  clicks_all: bigintLike.optional().default(BigInt(0)),
  spend: decimalLike.optional().default("0"),
  purchases: intLike.optional().default(0),
  purchase_conv_value: decimalLike.optional().default("0"),
  roas: decimalLike.optional().nullable(),
});
export const MetaBreakdownDailyEnvelope = RowEnvelope(MetaBreakdownDailyRow);

// ---- Google daily ----
export const GoogleDailyRow = z.object({
  date: isoDate,
  impressions: bigintLike.optional().default(BigInt(0)),
  clicks: bigintLike.optional().default(BigInt(0)),
  cost: decimalLike.optional().default("0"),
  total_conv_value: decimalLike.optional().default("0"),
  purchases: intLike.optional().default(0),
  adds_to_cart: intLike.optional().default(0),
  begins_checkout: intLike.optional().default(0),
  avg_cpc: decimalLike.optional().nullable(),
  ctr: decimalLike.optional().nullable(),
});
export const GoogleDailyEnvelope = RowEnvelope(GoogleDailyRow);

// ---- Google campaign type daily ----
export const GoogleCampaignTypeRow = z.object({
  date: isoDate,
  campaign_type: z.string().min(1),
  clicks: bigintLike.optional().default(BigInt(0)),
  cost: decimalLike.optional().default("0"),
  purchases: intLike.optional().default(0),
  total_conv_value: decimalLike.optional().default("0"),
  roas: decimalLike.optional().nullable(),
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

export const GoogleBreakdownDailyRow = z.object({
  date: isoDate,
  breakdown_type: z.enum(GOOGLE_BREAKDOWN_TYPES),
  dim1: z.string().min(1).max(255),
  dim2: z.string().max(128).optional().default(""),
  dim_meta: z.unknown().optional().nullable(),
  clicks: bigintLike.optional().default(BigInt(0)),
  cost: decimalLike.optional().default("0"),
  purchases: intLike.optional().default(0),
  total_conv_value: decimalLike.optional().default("0"),
  all_conv_value: decimalLike.optional().nullable(),
});
export const GoogleBreakdownDailyEnvelope = RowEnvelope(GoogleBreakdownDailyRow);
