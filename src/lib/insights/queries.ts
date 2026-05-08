import { Prisma, PrismaClient } from "@/generated/prisma-project/client";

export type DateRange = { start: Date; end: Date };

export type ProjectQueryContext = {
  client: PrismaClient;
  tenantId: string;
};

export function defaultRange(days = 28): DateRange {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { start, end };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function customRange(from: string, to: string): DateRange | null {
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to)) return null;
  const start = new Date(from + "T00:00:00Z");
  const end = new Date(to + "T00:00:00Z");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (start > end) return null;
  return { start, end };
}

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export type RangeParams = { days?: string; from?: string; to?: string };

export function resolveRange(params: RangeParams): { range: DateRange; days: number | null; from: string | null; to: string | null } {
  if (params.from && params.to) {
    const r = customRange(params.from, params.to);
    if (r) return { range: r, days: null, from: params.from, to: params.to };
  }
  const days = (() => {
    if (!params.days) return 28;
    const n = parseInt(params.days, 10);
    return Number.isFinite(n) && n > 0 && n <= 365 ? n : 28;
  })();
  return { range: defaultRange(days), days, from: null, to: null };
}

export function previousRange(r: DateRange): DateRange {
  const span = Math.round((r.end.getTime() - r.start.getTime()) / 86400000) + 1;
  const prevEnd = new Date(r.start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (span - 1));
  return { start: prevStart, end: prevEnd };
}

export function pctDelta(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null;
  return ((curr - prev) / prev) * 100;
}

const dec = (v: Prisma.Decimal | null | undefined) => Number(v ?? 0);
const big = (v: bigint | null | undefined) => Number(v ?? BigInt(0));

// ---- Shopify aggregate ----
export async function shopifyAggregate(ctx: ProjectQueryContext, r: DateRange) {
  const a = await ctx.client.shopifyDailyMetric.aggregate({
    where: { tenantId: ctx.tenantId, date: { gte: r.start, lte: r.end } },
    _sum: { totalSales: true, orders: true, returns: true },
  });
  const totalSales = dec(a._sum.totalSales);
  const orders = a._sum.orders ?? 0;
  const returns = a._sum.returns ?? 0;
  return {
    totalSales,
    orders,
    returns,
    avgOrderValue: orders > 0 ? totalSales / orders : 0,
  };
}

// ---- Meta aggregate (from MetaCampaignDaily) ----
export async function metaAggregate(ctx: ProjectQueryContext, r: DateRange) {
  const a = await ctx.client.metaCampaignDaily.aggregate({
    where: { tenantId: ctx.tenantId, date: { gte: r.start, lte: r.end } },
    _sum: {
      impressions: true,
      clicksAll: true,
      spend: true,
      purchases: true,
      purchaseConvValue: true,
      addsToCart: true,
      initiatedCheckouts: true,
    },
  });
  const spend = dec(a._sum.spend);
  const convValue = dec(a._sum.purchaseConvValue);
  const impressions = big(a._sum.impressions);
  const clicks = big(a._sum.clicksAll);
  return {
    impressions,
    clicks,
    spend,
    purchases: a._sum.purchases ?? 0,
    purchaseConvValue: convValue,
    addsToCart: a._sum.addsToCart ?? 0,
    initiatedCheckouts: a._sum.initiatedCheckouts ?? 0,
    roas: spend > 0 ? convValue / spend : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    ctr: impressions > 0 ? clicks / impressions : 0,
  };
}

// ---- Google aggregate ----
export async function googleAggregate(ctx: ProjectQueryContext, r: DateRange) {
  const a = await ctx.client.googleDailyMetric.aggregate({
    where: { tenantId: ctx.tenantId, date: { gte: r.start, lte: r.end } },
    _sum: {
      impressions: true,
      clicks: true,
      cost: true,
      totalConvValue: true,
      purchases: true,
      addsToCart: true,
      beginsCheckout: true,
    },
  });
  const cost = dec(a._sum.cost);
  const convValue = dec(a._sum.totalConvValue);
  const impressions = big(a._sum.impressions);
  const clicks = big(a._sum.clicks);
  return {
    impressions,
    clicks,
    cost,
    totalConvValue: convValue,
    purchases: a._sum.purchases ?? 0,
    addsToCart: a._sum.addsToCart ?? 0,
    beginsCheckout: a._sum.beginsCheckout ?? 0,
    roas: cost > 0 ? convValue / cost : 0,
    cpc: clicks > 0 ? cost / clicks : 0,
    ctr: impressions > 0 ? clicks / impressions : 0,
  };
}

// ---- Daily series ----
export type DailyPoint = { date: string; v1: number; v2: number };

export async function shopifyDailySeries(ctx: ProjectQueryContext, r: DateRange): Promise<DailyPoint[]> {
  const rows = await ctx.client.shopifyDailyMetric.findMany({
    where: { tenantId: ctx.tenantId, date: { gte: r.start, lte: r.end } },
    orderBy: { date: "asc" },
    select: { date: true, totalSales: true },
  });
  const meta = await ctx.client.metaCampaignDaily.groupBy({
    by: ["date"],
    where: { tenantId: ctx.tenantId, date: { gte: r.start, lte: r.end } },
    _sum: { spend: true },
  });
  const google = await ctx.client.googleDailyMetric.findMany({
    where: { tenantId: ctx.tenantId, date: { gte: r.start, lte: r.end } },
    select: { date: true, cost: true },
  });
  const adCostByDay = new Map<string, number>();
  for (const m of meta) {
    const k = isoDay(m.date);
    adCostByDay.set(k, (adCostByDay.get(k) ?? 0) + dec(m._sum.spend));
  }
  for (const g of google) {
    const k = isoDay(g.date);
    adCostByDay.set(k, (adCostByDay.get(k) ?? 0) + dec(g.cost));
  }
  return rows.map((r) => ({
    date: isoDay(r.date),
    v1: dec(r.totalSales),
    v2: adCostByDay.get(isoDay(r.date)) ?? 0,
  }));
}

export async function metaDailySeries(ctx: ProjectQueryContext, r: DateRange): Promise<DailyPoint[]> {
  const rows = await ctx.client.metaCampaignDaily.groupBy({
    by: ["date"],
    where: { tenantId: ctx.tenantId, date: { gte: r.start, lte: r.end } },
    _sum: { spend: true, purchaseConvValue: true },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({
    date: isoDay(r.date),
    v1: dec(r._sum.purchaseConvValue),
    v2: dec(r._sum.spend),
  }));
}

export async function googleDailySeries(ctx: ProjectQueryContext, r: DateRange): Promise<DailyPoint[]> {
  const rows = await ctx.client.googleDailyMetric.findMany({
    where: { tenantId: ctx.tenantId, date: { gte: r.start, lte: r.end } },
    orderBy: { date: "asc" },
    select: { date: true, totalConvValue: true, cost: true },
  });
  return rows.map((r) => ({
    date: isoDay(r.date),
    v1: dec(r.totalConvValue),
    v2: dec(r.cost),
  }));
}

// ---- Last data refresh timestamp per source ----

export async function lastFetchedAt(ctx: ProjectQueryContext) {
  const [shopify, metaCamp, metaAd, metaBk, gDaily, gType, gBk] = await Promise.all([
    ctx.client.shopifyDailyMetric.aggregate({ where: { tenantId: ctx.tenantId }, _max: { fetchedAt: true } }),
    ctx.client.metaCampaignDaily.aggregate({ where: { tenantId: ctx.tenantId }, _max: { fetchedAt: true } }),
    ctx.client.metaAdDaily.aggregate({ where: { tenantId: ctx.tenantId }, _max: { fetchedAt: true } }),
    ctx.client.metaBreakdownDaily.aggregate({ where: { tenantId: ctx.tenantId }, _max: { fetchedAt: true } }),
    ctx.client.googleDailyMetric.aggregate({ where: { tenantId: ctx.tenantId }, _max: { fetchedAt: true } }),
    ctx.client.googleCampaignTypeDaily.aggregate({ where: { tenantId: ctx.tenantId }, _max: { fetchedAt: true } }),
    ctx.client.googleBreakdownDaily.aggregate({ where: { tenantId: ctx.tenantId }, _max: { fetchedAt: true } }),
  ]);
  const maxOf = (...dates: (Date | null | undefined)[]): Date | null => {
    const valid = dates.filter((d): d is Date => d != null);
    if (valid.length === 0) return null;
    return new Date(Math.max(...valid.map((d) => d.getTime())));
  };
  return {
    shopify: shopify._max.fetchedAt ?? null,
    meta: maxOf(metaCamp._max.fetchedAt, metaAd._max.fetchedAt, metaBk._max.fetchedAt),
    google: maxOf(gDaily._max.fetchedAt, gType._max.fetchedAt, gBk._max.fetchedAt),
  };
}

// ---- Top campaigns / creatives / breakdowns ----

export async function topMetaCampaigns(ctx: ProjectQueryContext, r: DateRange, limit = 20) {
  const rows = await ctx.client.metaCampaignDaily.groupBy({
    by: ["campaignId", "campaignName"],
    where: { tenantId: ctx.tenantId, date: { gte: r.start, lte: r.end } },
    _sum: {
      impressions: true,
      clicksAll: true,
      spend: true,
      purchases: true,
      purchaseConvValue: true,
    },
    orderBy: { _sum: { spend: "desc" } },
    take: limit,
  });
  return rows.map((row) => {
    const spend = dec(row._sum.spend);
    const convValue = dec(row._sum.purchaseConvValue);
    return {
      campaignId: row.campaignId,
      campaignName: row.campaignName,
      impressions: big(row._sum.impressions),
      clicks: big(row._sum.clicksAll),
      spend,
      purchases: row._sum.purchases ?? 0,
      convValue,
      roas: spend > 0 ? convValue / spend : 0,
    };
  });
}

export async function topMetaCreatives(ctx: ProjectQueryContext, r: DateRange, limit = 20) {
  const rows = await ctx.client.metaAdDaily.groupBy({
    by: ["adId", "adName", "adCreativeImageUrl", "adBody"],
    where: { tenantId: ctx.tenantId, date: { gte: r.start, lte: r.end } },
    _sum: {
      impressions: true,
      clicksAll: true,
      spend: true,
      websitePurchases: true,
      purchaseConvValue: true,
    },
    orderBy: { _sum: { spend: "desc" } },
    take: limit,
  });
  return rows.map((row) => {
    const spend = dec(row._sum.spend);
    const convValue = dec(row._sum.purchaseConvValue);
    const impressions = big(row._sum.impressions);
    const clicks = big(row._sum.clicksAll);
    return {
      adId: row.adId,
      adName: row.adName,
      adCreativeImageUrl: row.adCreativeImageUrl,
      adBody: row.adBody,
      impressions,
      clicks,
      spend,
      websitePurchases: row._sum.websitePurchases ?? 0,
      convValue,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      ctr: impressions > 0 ? clicks / impressions : 0,
      cpc: clicks > 0 ? spend / clicks : 0,
      roas: spend > 0 ? convValue / spend : 0,
    };
  });
}

export async function metaBreakdownTop(
  ctx: ProjectQueryContext,
  r: DateRange,
  breakdownType: string,
  limit = 20,
) {
  const rows = await ctx.client.metaBreakdownDaily.groupBy({
    by: ["dim1", "dim2"],
    where: { tenantId: ctx.tenantId, breakdownType, date: { gte: r.start, lte: r.end } },
    _sum: {
      impressions: true,
      clicksAll: true,
      spend: true,
      purchases: true,
      purchaseConvValue: true,
    },
    orderBy: { _sum: { spend: "desc" } },
    take: limit,
  });
  return rows.map((row) => {
    const spend = dec(row._sum.spend);
    const convValue = dec(row._sum.purchaseConvValue);
    return {
      dim1: row.dim1,
      dim2: row.dim2,
      impressions: big(row._sum.impressions),
      clicks: big(row._sum.clicksAll),
      spend,
      purchases: row._sum.purchases ?? 0,
      convValue,
      roas: spend > 0 ? convValue / spend : 0,
    };
  });
}

export async function googleCampaignTypeAggregate(ctx: ProjectQueryContext, r: DateRange) {
  const rows = await ctx.client.googleCampaignTypeDaily.groupBy({
    by: ["campaignType"],
    where: { tenantId: ctx.tenantId, date: { gte: r.start, lte: r.end } },
    _sum: {
      clicks: true,
      cost: true,
      purchases: true,
      totalConvValue: true,
    },
    orderBy: { _sum: { cost: "desc" } },
  });
  return rows.map((row) => {
    const cost = dec(row._sum.cost);
    const convValue = dec(row._sum.totalConvValue);
    return {
      campaignType: row.campaignType,
      clicks: big(row._sum.clicks),
      cost,
      purchases: row._sum.purchases ?? 0,
      convValue,
      roas: cost > 0 ? convValue / cost : 0,
    };
  });
}

export async function googleBreakdownTop(
  ctx: ProjectQueryContext,
  r: DateRange,
  breakdownType: string,
  limit = 20,
) {
  const rows = await ctx.client.googleBreakdownDaily.groupBy({
    by: ["dim1", "dim2"],
    where: { tenantId: ctx.tenantId, breakdownType, date: { gte: r.start, lte: r.end } },
    _sum: {
      clicks: true,
      cost: true,
      purchases: true,
      totalConvValue: true,
      allConvValue: true,
    },
    orderBy: { _sum: { cost: "desc" } },
    take: limit,
  });
  return rows.map((row) => {
    const cost = dec(row._sum.cost);
    const convValue = dec(row._sum.totalConvValue);
    return {
      dim1: row.dim1,
      dim2: row.dim2,
      clicks: big(row._sum.clicks),
      cost,
      purchases: row._sum.purchases ?? 0,
      totalConvValue: convValue,
      allConvValue: dec(row._sum.allConvValue),
      roas: cost > 0 ? convValue / cost : 0,
    };
  });
}
