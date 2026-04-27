import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

export type DateRange = { start: Date; end: Date };

export function defaultRange(days = 28): DateRange {
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return { start, end };
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
export async function shopifyAggregate(tenantId: string, r: DateRange) {
  const a = await prisma.shopifyDailyMetric.aggregate({
    where: { tenantId, date: { gte: r.start, lte: r.end } },
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
export async function metaAggregate(tenantId: string, r: DateRange) {
  const a = await prisma.metaCampaignDaily.aggregate({
    where: { tenantId, date: { gte: r.start, lte: r.end } },
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
export async function googleAggregate(tenantId: string, r: DateRange) {
  const a = await prisma.googleDailyMetric.aggregate({
    where: { tenantId, date: { gte: r.start, lte: r.end } },
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

export async function shopifyDailySeries(tenantId: string, r: DateRange): Promise<DailyPoint[]> {
  const rows = await prisma.shopifyDailyMetric.findMany({
    where: { tenantId, date: { gte: r.start, lte: r.end } },
    orderBy: { date: "asc" },
    select: { date: true, totalSales: true },
  });
  // also need ad cost from meta + google
  const meta = await prisma.metaCampaignDaily.groupBy({
    by: ["date"],
    where: { tenantId, date: { gte: r.start, lte: r.end } },
    _sum: { spend: true },
  });
  const google = await prisma.googleDailyMetric.findMany({
    where: { tenantId, date: { gte: r.start, lte: r.end } },
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

export async function metaDailySeries(tenantId: string, r: DateRange): Promise<DailyPoint[]> {
  const rows = await prisma.metaCampaignDaily.groupBy({
    by: ["date"],
    where: { tenantId, date: { gte: r.start, lte: r.end } },
    _sum: { spend: true, purchaseConvValue: true },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({
    date: isoDay(r.date),
    v1: dec(r._sum.purchaseConvValue),
    v2: dec(r._sum.spend),
  }));
}

export async function googleDailySeries(tenantId: string, r: DateRange): Promise<DailyPoint[]> {
  const rows = await prisma.googleDailyMetric.findMany({
    where: { tenantId, date: { gte: r.start, lte: r.end } },
    orderBy: { date: "asc" },
    select: { date: true, totalConvValue: true, cost: true },
  });
  return rows.map((r) => ({
    date: isoDay(r.date),
    v1: dec(r.totalConvValue),
    v2: dec(r.cost),
  }));
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// ---- Top campaigns / creatives / breakdowns ----

export async function topMetaCampaigns(tenantId: string, r: DateRange, limit = 20) {
  const rows = await prisma.metaCampaignDaily.groupBy({
    by: ["campaignId", "campaignName"],
    where: { tenantId, date: { gte: r.start, lte: r.end } },
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

export async function topMetaCreatives(tenantId: string, r: DateRange, limit = 20) {
  const rows = await prisma.metaAdDaily.groupBy({
    by: ["adId", "adName", "adCreativeImageUrl", "adBody"],
    where: { tenantId, date: { gte: r.start, lte: r.end } },
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
  tenantId: string,
  r: DateRange,
  breakdownType: string,
  limit = 20,
) {
  const rows = await prisma.metaBreakdownDaily.groupBy({
    by: ["dim1", "dim2"],
    where: { tenantId, breakdownType, date: { gte: r.start, lte: r.end } },
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

export async function googleCampaignTypeAggregate(tenantId: string, r: DateRange) {
  const rows = await prisma.googleCampaignTypeDaily.groupBy({
    by: ["campaignType"],
    where: { tenantId, date: { gte: r.start, lte: r.end } },
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
  tenantId: string,
  r: DateRange,
  breakdownType: string,
  limit = 20,
) {
  const rows = await prisma.googleBreakdownDaily.groupBy({
    by: ["dim1", "dim2"],
    where: { tenantId, breakdownType, date: { gte: r.start, lte: r.end } },
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
