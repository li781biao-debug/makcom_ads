import { auth } from "@/auth";
import { resolveCurrentView } from "@/lib/db/currentView";
import { projectClient } from "@/lib/db/projectClient";
import {
  resolveRange,
  previousRange,
  pctDelta,
  shopifyAggregateMulti,
  metaAggregateMulti,
  googleAggregateMulti,
  shopifyAggregate,
  metaAggregate,
  googleAggregate,
  shopifyDailySeriesMulti,
  lastFetchedAtMulti,
  type ProjectQueryContext,
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

type ProjectRow = {
  projectName: string;
  shopifySales: number;
  adCost: number;
  convValue: number;
  purchases: number;
  roas: number;
};

export default async function ReportsOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string; project?: string }>;
}) {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;
  const params = await searchParams;
  const { view } = await resolveCurrentView({ userId, urlSlug: params.project ?? null });
  if (!view) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center text-zinc-500 space-y-4">
        <div>当前账号没有任何已审核通过的项目权限。</div>
        <a href="/apply" className="inline-block rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">
          去申请项目权限
        </a>
      </div>
    );
  }

  const isGroup = view.kind === "group";
  const memberProjects = isGroup ? view.group.projects : [view.project];
  const viewSlug = isGroup ? view.group.slug : view.project.slug;

  const ctxs: ProjectQueryContext[] = memberProjects.map((p) => ({
    client: projectClient(p.dbName),
    tenantId: p.id,
  }));

  const { range, days, from, to } = resolveRange(params);
  const prev = previousRange(range);

  const [
    shopify, meta, google,
    prevShopify, prevMeta, prevGoogle,
    series, fresh,
    perProject,
  ] = await Promise.all([
    shopifyAggregateMulti(ctxs, range),
    metaAggregateMulti(ctxs, range),
    googleAggregateMulti(ctxs, range),
    shopifyAggregateMulti(ctxs, prev),
    metaAggregateMulti(ctxs, prev),
    googleAggregateMulti(ctxs, prev),
    shopifyDailySeriesMulti(ctxs, range),
    lastFetchedAtMulti(ctxs),
    isGroup
      ? Promise.all(memberProjects.map(async (p) => {
          const c: ProjectQueryContext = { client: projectClient(p.dbName), tenantId: p.id };
          const [sh, m, g] = await Promise.all([
            shopifyAggregate(c, range),
            metaAggregate(c, range),
            googleAggregate(c, range),
          ]);
          const cost = m.spend + g.cost;
          const conv = m.purchaseConvValue + g.totalConvValue;
          const purch = m.purchases + g.purchases;
          return {
            projectName: p.name,
            shopifySales: sh.totalSales,
            adCost: cost,
            convValue: conv,
            purchases: purch,
            roas: cost > 0 ? conv / cost : 0,
          } as ProjectRow;
        }))
      : Promise.resolve(null),
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
    { channel: "Google Ads", cost: google.cost, purchases: google.purchases, convValue: google.totalConvValue, roas: google.roas },
    { channel: "Meta Ads",   cost: meta.spend,   purchases: meta.purchases,   convValue: meta.purchaseConvValue, roas: meta.roas },
  ];
  const prevChannelRows: Channel[] = [
    { channel: "Google Ads", cost: prevGoogle.cost, purchases: prevGoogle.purchases, convValue: prevGoogle.totalConvValue, roas: prevGoogle.roas },
    { channel: "Meta Ads",   cost: prevMeta.spend,   purchases: prevMeta.purchases,   convValue: prevMeta.purchaseConvValue, roas: prevMeta.roas },
  ];
  const channelTotal: Channel = {
    channel: "总计", cost: adCost, purchases: totalPurchases, convValue: totalConvValue,
    roas: adCost > 0 ? totalConvValue / adCost : 0,
  };
  const prevChannelTotal: Channel = {
    channel: "总计", cost: prevAdCost, purchases: prevTotalPurchases, convValue: prevTotalConvValue,
    roas: prevAdCost > 0 ? prevTotalConvValue / prevAdCost : 0,
  };

  const channelCols: Col<Channel>[] = [
    { key: "channel", header: "渠道", render: (r) => r.channel },
    { key: "cost", header: "Spend", align: "right",
      render: (r) => fmtMoney(r.cost),
      delta: (c, p) => p ? pctDelta(c.cost, p.cost) : null },
    { key: "purchases", header: "Purchases", align: "right",
      render: (r) => fmtCompact(r.purchases),
      delta: (c, p) => p ? pctDelta(c.purchases, p.purchases) : null },
    { key: "convValue", header: "Conv. value", align: "right",
      render: (r) => fmtMoney(r.convValue),
      delta: (c, p) => p ? pctDelta(c.convValue, p.convValue) : null },
    { key: "roas", header: "ROAS", align: "right",
      render: (r) => r.roas.toFixed(2),
      delta: (c, p) => p ? pctDelta(c.roas, p.roas) : null },
  ];

  // Per-project contribution table (group mode only)
  const projectCols: Col<ProjectRow>[] = [
    { key: "project", header: "项目", render: (r) => r.projectName },
    { key: "shopify", header: "Shopify Sales", align: "right", render: (r) => fmtMoney(r.shopifySales) },
    { key: "adCost",  header: "Ad Cost",       align: "right", render: (r) => fmtMoney(r.adCost) },
    { key: "convValue", header: "Conv. Value", align: "right", render: (r) => fmtMoney(r.convValue) },
    { key: "purchases", header: "Purchases",   align: "right", render: (r) => fmtCompact(r.purchases) },
    { key: "roas",    header: "ROAS",          align: "right", render: (r) => r.roas.toFixed(2) },
  ];
  const projectTotalRow: ProjectRow | undefined = perProject
    ? {
        projectName: "总计",
        shopifySales: shopify.totalSales,
        adCost,
        convValue: totalConvValue,
        purchases: totalPurchases,
        roas: adCost > 0 ? totalConvValue / adCost : 0,
      }
    : undefined;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <DateRangeBar active={days} from={from} to={to} basePath="/reports" projectSlug={viewSlug} />
        <Freshness shopify={fresh.shopify} meta={fresh.meta} google={fresh.google} />
      </div>
      {isGroup && (
        <div className="text-xs text-zinc-500">
          合计视图 · {memberProjects.length} 个项目 · 所有金额已统一为 USD
        </div>
      )}

      <section>
        <h2 className="text-base font-medium mb-3">Shopify 表现</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Total sales" value={fmtCompact(shopify.totalSales)} delta={pctDelta(shopify.totalSales, prevShopify.totalSales)} />
          <Kpi label="Total ad cost" value={fmtCompact(adCost)} delta={pctDelta(adCost, prevAdCost)} />
          <Kpi label="ROI (含退货)" value={roiInclReturns.toFixed(2)} delta={pctDelta(roiInclReturns, prevRoiInclReturns)} />
          <Kpi label="Orders" value={fmtCompact(shopify.orders)} delta={pctDelta(shopify.orders, prevShopify.orders)} />
          <Kpi label="Avg. order value" value={fmtMoney(shopify.avgOrderValue)} delta={pctDelta(shopify.avgOrderValue, prevShopify.avgOrderValue)} />
          <Kpi label="Returns" value={fmtCompact(shopify.returns)} delta={pctDelta(shopify.returns, prevShopify.returns)} />
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
          <Kpi label="Total ad conv. value" value={fmtCompact(totalConvValue)} delta={pctDelta(totalConvValue, prevTotalConvValue)} />
          <Kpi label="Purchase" value={fmtCompact(totalPurchases)} delta={pctDelta(totalPurchases, prevTotalPurchases)} />
          <Kpi label="ROAS"
            value={(adCost > 0 ? totalConvValue / adCost : 0).toFixed(2)}
            delta={pctDelta(adCost > 0 ? totalConvValue / adCost : 0, prevAdCost > 0 ? prevTotalConvValue / prevAdCost : 0)}
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
        <DataTable
          title="Ad channel"
          rows={channelRows}
          cols={channelCols}
          prevRows={prevChannelRows}
          identity={(r) => r.channel}
          totalsRow={channelTotal}
          prevTotalsRow={prevChannelTotal}
        />
      </section>

      {perProject && projectTotalRow && (
        <section>
          <DataTable
            title="各项目贡献"
            rows={perProject}
            cols={projectCols}
            identity={(r) => r.projectName}
            totalsRow={projectTotalRow}
            maxHeight={500}
          />
        </section>
      )}
    </div>
  );
}
