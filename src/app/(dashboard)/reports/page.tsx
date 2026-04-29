import { auth } from "@/auth";
import { getPrimaryTenant } from "@/lib/tenant";
import {
  defaultRange,
  previousRange,
  pctDelta,
  shopifyAggregate,
  metaAggregate,
  googleAggregate,
  shopifyDailySeries,
  lastFetchedAt,
} from "@/lib/insights/queries";
import { Kpi, fmtCompact, fmtMoney, fmtPct } from "@/components/insights/Kpi";
import { LineChart } from "@/components/insights/LineChart";
import { DataTable, Col } from "@/components/insights/DataTable";
import { DateRangeBar } from "@/components/insights/DateRangeBar";
import { Freshness } from "@/components/insights/Freshness";

type Channel = {
  channel: string;
  cost: number;
  purchases: number;
  convValue: number;
  roas: number;
};

export default async function ReportsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;
  const tenant = await getPrimaryTenant(userId);
  if (!tenant) return <div>请先创建工作区</div>;

  const params = await searchParams;
  const days = parsePositiveInt(params.days, 28);
  const range = defaultRange(days);
  const prev = previousRange(range);

  const [shopify, meta, google, prevShopify, prevMeta, prevGoogle, series, fresh] = await Promise.all([
    shopifyAggregate(tenant.id, range),
    metaAggregate(tenant.id, range),
    googleAggregate(tenant.id, range),
    shopifyAggregate(tenant.id, prev),
    metaAggregate(tenant.id, prev),
    googleAggregate(tenant.id, prev),
    shopifyDailySeries(tenant.id, range),
    lastFetchedAt(tenant.id),
  ]);

  const adCost = meta.spend + google.cost;
  const prevAdCost = prevMeta.spend + prevGoogle.cost;
  const totalConvValue = meta.purchaseConvValue + google.totalConvValue;
  const prevTotalConvValue = prevMeta.purchaseConvValue + prevGoogle.totalConvValue;
  const totalPurchases = meta.purchases + google.purchases;
  const prevTotalPurchases = prevMeta.purchases + prevGoogle.purchases;
  const totalImpressions = Number(meta.impressions) + Number(google.impressions);
  const prevTotalImpressions = Number(prevMeta.impressions) + Number(prevGoogle.impressions);
  const totalClicks = Number(meta.clicks) + Number(google.clicks);
  const prevTotalClicks = Number(prevMeta.clicks) + Number(prevGoogle.clicks);
  const totalAddToCart = meta.addsToCart + google.addsToCart;
  const prevTotalAddToCart = prevMeta.addsToCart + prevGoogle.addsToCart;
  const totalIc = meta.initiatedCheckouts + google.beginsCheckout;
  const prevTotalIc = prevMeta.initiatedCheckouts + prevGoogle.beginsCheckout;

  const roiInclReturns = adCost > 0 ? shopify.totalSales / adCost : 0;
  const prevRoiInclReturns = prevAdCost > 0 ? prevShopify.totalSales / prevAdCost : 0;

  const channelRows: Channel[] = [
    {
      channel: "Google Ads",
      cost: google.cost,
      purchases: google.purchases,
      convValue: google.totalConvValue,
      roas: google.roas,
    },
    {
      channel: "Meta Ads",
      cost: meta.spend,
      purchases: meta.purchases,
      convValue: meta.purchaseConvValue,
      roas: meta.roas,
    },
  ];

  const channelCols: Col<Channel>[] = [
    { key: "channel", header: "渠道", render: (r) => r.channel },
    { key: "cost", header: "Spend", render: (r) => fmtMoney(r.cost), align: "right" },
    { key: "purchases", header: "Purchases", render: (r) => fmtCompact(r.purchases), align: "right" },
    { key: "convValue", header: "Conv. value", render: (r) => fmtMoney(r.convValue), align: "right" },
    { key: "roas", header: "ROAS", render: (r) => r.roas.toFixed(2), align: "right" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <DateRangeBar active={days} basePath="/reports" />
        <Freshness shopify={fresh.shopify} meta={fresh.meta} google={fresh.google} />
      </div>

      <section>
        <h2 className="text-base font-medium mb-3">Shopify 表现</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi
            label="Total sales"
            value={fmtCompact(shopify.totalSales)}
            delta={pctDelta(shopify.totalSales, prevShopify.totalSales)}
          />
          <Kpi
            label="Total ad cost"
            value={fmtCompact(adCost)}
            delta={pctDelta(adCost, prevAdCost)}
          />
          <Kpi
            label="ROI (含退货)"
            value={roiInclReturns.toFixed(2)}
            delta={pctDelta(roiInclReturns, prevRoiInclReturns)}
          />
          <Kpi
            label="Orders"
            value={fmtCompact(shopify.orders)}
            delta={pctDelta(shopify.orders, prevShopify.orders)}
          />
          <Kpi
            label="Avg. order value"
            value={fmtMoney(shopify.avgOrderValue)}
            delta={pctDelta(shopify.avgOrderValue, prevShopify.avgOrderValue)}
          />
          <Kpi
            label="Returns"
            value={fmtCompact(shopify.returns)}
            delta={pctDelta(shopify.returns, prevShopify.returns)}
          />
        </div>
      </section>

      <section>
        <h2 className="text-base font-medium mb-3">每日 Total sales vs Total ad cost</h2>
        <LineChart
          labels={series.map((s) => s.date)}
          series={[
            { name: "Total sales", color: "#3b82f6", values: series.map((s) => s.v1) },
            { name: "Total ad cost", color: "#10b981", values: series.map((s) => s.v2) },
          ]}
        />
      </section>

      <section>
        <h2 className="text-base font-medium mb-3">广告表现 (Meta + Google)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Kpi
            label="Total ad conv. value"
            value={fmtCompact(totalConvValue)}
            delta={pctDelta(totalConvValue, prevTotalConvValue)}
          />
          <Kpi
            label="Purchase"
            value={fmtCompact(totalPurchases)}
            delta={pctDelta(totalPurchases, prevTotalPurchases)}
          />
          <Kpi
            label="ROAS"
            value={(adCost > 0 ? totalConvValue / adCost : 0).toFixed(2)}
            delta={pctDelta(
              adCost > 0 ? totalConvValue / adCost : 0,
              prevAdCost > 0 ? prevTotalConvValue / prevAdCost : 0,
            )}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-3">
          <Kpi size="sm" label="Impressions" value={fmtCompact(totalImpressions)} delta={pctDelta(totalImpressions, prevTotalImpressions)} />
          <Kpi size="sm" label="Clicks" value={fmtCompact(totalClicks)} delta={pctDelta(totalClicks, prevTotalClicks)} />
          <Kpi size="sm" label="CPC" value={(totalClicks > 0 ? adCost / totalClicks : 0).toFixed(2)} delta={null} />
          <Kpi size="sm" label="CTR" value={fmtPct(totalImpressions > 0 ? totalClicks / totalImpressions : 0)} delta={null} />
          <Kpi size="sm" label="Add to cart" value={fmtCompact(totalAddToCart)} delta={pctDelta(totalAddToCart, prevTotalAddToCart)} />
          <Kpi size="sm" label="Initiated checkout" value={fmtCompact(totalIc)} delta={pctDelta(totalIc, prevTotalIc)} />
        </div>
      </section>

      <section>
        <DataTable title="Ad channel" rows={channelRows} cols={channelCols} />
      </section>
    </div>
  );
}

function parsePositiveInt(v: string | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 && n <= 365 ? n : fallback;
}
