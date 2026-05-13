import { auth } from "@/auth";
import { resolveCurrentView } from "@/lib/db/currentView";
import { projectClient } from "@/lib/db/projectClient";
import {
  resolveRange,
  previousRange,
  pctDelta,
  metaAggregate,
  metaAggregateMulti,
  metaDailySeries,
  metaDailySeriesMulti,
  topMetaCampaigns,
  topMetaCreatives,
  metaBreakdownTop,
  lastFetchedAt,
  lastFetchedAtMulti,
  listMetaAccounts,
  sumNumeric,
  type ProjectQueryContext,
} from "@/lib/insights/queries";
import { Kpi, fmtCompact, fmtMoney, fmtPct, fmtNumber } from "@/components/insights/Kpi";
import { LineChart } from "@/components/insights/LineChart";
import { DataTable, Col } from "@/components/insights/DataTable";
import { DateRangeBar } from "@/components/insights/DateRangeBar";
import { PieChart, autoColors } from "@/components/insights/PieChart";
import { Freshness } from "@/components/insights/Freshness";
import { AdAccountSwitcher } from "@/components/insights/AdAccountSwitcher";

export default async function MetaReportPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string; project?: string; meta_account?: string }>;
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

  // ---- Group mode: aggregated KPIs + per-project contribution. Drill-down
  // tables (campaigns / breakdowns / creatives) are hidden because they don't
  // aggregate sensibly across disjoint projects. ----
  if (view.kind === "group") {
    return <MetaGroupView group={view.group} params={params} />;
  }

  const project = view.project;
  const client = projectClient(project.dbName);
  const accountId = params.meta_account || null;
  const ctx: ProjectQueryContext = {
    client,
    tenantId: project.id,
    metaAccountId: accountId,
  };
  const accounts = await listMetaAccounts({ client, tenantId: project.id });

  const { range, days, from, to } = resolveRange(params);
  const prev = previousRange(range);

  const [
    meta,
    prevMeta,
    series,
    campaigns,
    prevCampaigns,
    creatives,
    prevCreatives,
    byCountry,
    prevByCountry,
    byPlatform,
    prevByPlatform,
    byPromoted,
    prevByPromoted,
    byLanding,
    prevByLanding,
    byAgeGender,
    byDevice,
    fresh,
  ] = await Promise.all([
    metaAggregate(ctx, range),
    metaAggregate(ctx, prev),
    metaDailySeries(ctx, range),
    topMetaCampaigns(ctx, range, 50),
    topMetaCampaigns(ctx, prev, 200),
    topMetaCreatives(ctx, range, 20),
    topMetaCreatives(ctx, prev, 200),
    metaBreakdownTop(ctx, range, "country", 30),
    metaBreakdownTop(ctx, prev, "country", 200),
    metaBreakdownTop(ctx, range, "publisher_platform", 20),
    metaBreakdownTop(ctx, prev, "publisher_platform", 50),
    metaBreakdownTop(ctx, range, "promoted_object", 20),
    metaBreakdownTop(ctx, prev, "promoted_object", 100),
    metaBreakdownTop(ctx, range, "landing_page", 20),
    metaBreakdownTop(ctx, prev, "landing_page", 100),
    metaBreakdownTop(ctx, range, "age_gender", 50),
    metaBreakdownTop(ctx, range, "device_platform", 10),
    lastFetchedAt(ctx),
  ]);

  // ---- Totals + previous totals (re-derive ratios after summing) ----
  type Camp = (typeof campaigns)[number];
  type Creative = (typeof creatives)[number];
  type Bk = (typeof byCountry)[number];

  function campTotals(arr: Camp[]): Camp {
    const t = sumNumeric(arr, {
      campaignId: "__totals__",
      campaignName: "总计",
      impressions: 0,
      clicks: 0,
      spend: 0,
      purchases: 0,
      convValue: 0,
      roas: 0,
    } as Camp);
    return { ...t, roas: t.spend > 0 ? t.convValue / t.spend : 0 };
  }

  function creativeTotals(arr: Creative[]): Creative {
    const t = sumNumeric(arr, {
      adId: "__totals__",
      adName: "总计",
      adCreativeImageUrl: null,
      adBody: null,
      impressions: 0,
      clicks: 0,
      spend: 0,
      websitePurchases: 0,
      convValue: 0,
      cpm: 0,
      ctr: 0,
      cpc: 0,
      roas: 0,
    } as Creative);
    const impr = Number(t.impressions);
    const clk = Number(t.clicks);
    return {
      ...t,
      cpm: impr > 0 ? (t.spend / impr) * 1000 : 0,
      ctr: impr > 0 ? clk / impr : 0,
      cpc: clk > 0 ? t.spend / clk : 0,
      roas: t.spend > 0 ? t.convValue / t.spend : 0,
    };
  }

  function bkTotals(arr: Bk[], label: string): Bk {
    const t = sumNumeric(arr, {
      dim1: label,
      dim2: "",
      impressions: 0,
      clicks: 0,
      spend: 0,
      purchases: 0,
      convValue: 0,
      roas: 0,
    } as Bk);
    return { ...t, roas: t.spend > 0 ? t.convValue / t.spend : 0 };
  }

  const campTotal = campTotals(campaigns);
  const prevCampTotal = campTotals(prevCampaigns);
  const creativeTotal = creativeTotals(creatives);
  const prevCreativeTotal = creativeTotals(prevCreatives);
  const countryTotal = bkTotals(byCountry, "总计");
  const prevCountryTotal = bkTotals(prevByCountry, "总计");
  const platformTotal = bkTotals(byPlatform, "总计");
  const prevPlatformTotal = bkTotals(prevByPlatform, "总计");
  const promotedTotal = bkTotals(byPromoted, "总计");
  const prevPromotedTotal = bkTotals(prevByPromoted, "总计");
  const landingTotal = bkTotals(byLanding, "总计");
  const prevLandingTotal = bkTotals(prevByLanding, "总计");

  // Small helpers — reduce repetition in column delta callbacks.
  const dNum = <K extends string>(key: K) =>
    (c: Record<K, number | bigint>, p?: Record<K, number | bigint>) =>
      p ? pctDelta(Number(c[key]), Number(p[key])) : null;

  const campCols: Col<Camp>[] = [
    { key: "name", header: "Campaign name", render: (r) => <span className="text-xs">{r.campaignName}</span> },
    { key: "clicks", header: "Clicks", align: "right",
      render: (r) => fmtCompact(Number(r.clicks)),
      delta: (c, p) => p ? pctDelta(Number(c.clicks), Number(p.clicks)) : null },
    { key: "spend", header: "Spend", align: "right",
      render: (r) => fmtMoney(r.spend),
      delta: (c, p) => p ? pctDelta(c.spend, p.spend) : null },
    { key: "purchases", header: "Purchase", align: "right",
      render: (r) => fmtNumber(r.purchases),
      delta: (c, p) => p ? pctDelta(c.purchases, p.purchases) : null },
    { key: "conv", header: "Conv. value", align: "right",
      render: (r) => fmtMoney(r.convValue),
      delta: (c, p) => p ? pctDelta(c.convValue, p.convValue) : null },
    { key: "roas", header: "ROAS", align: "right",
      render: (r) => r.roas.toFixed(2),
      delta: (c, p) => p ? pctDelta(c.roas, p.roas) : null },
  ];

  const creativeCols: Col<Creative>[] = [
    {
      key: "img",
      header: "",
      render: (r) =>
        r.adCreativeImageUrl ? (
          <img src={r.adCreativeImageUrl} alt="" className="w-12 h-12 object-cover rounded" loading="lazy" />
        ) : (
          <div className="w-12 h-12 rounded bg-zinc-100 dark:bg-zinc-800" />
        ),
      width: "60px",
    },
    {
      key: "name",
      header: "Ad",
      render: (r) => (
        <div>
          <div className="text-xs font-medium truncate max-w-[240px]">{r.adName}</div>
          <div className="text-xs text-zinc-500 truncate max-w-[240px]">{r.adBody ?? ""}</div>
        </div>
      ),
    },
    { key: "cpm", header: "CPM", align: "right",
      render: (r) => r.cpm.toFixed(0),
      delta: (c, p) => p ? pctDelta(c.cpm, p.cpm) : null },
    { key: "ctr", header: "CTR", align: "right",
      render: (r) => fmtPct(r.ctr, 1),
      delta: (c, p) => p ? pctDelta(c.ctr, p.ctr) : null },
    { key: "cpc", header: "CPC", align: "right",
      render: (r) => r.cpc.toFixed(2),
      delta: (c, p) => p ? pctDelta(c.cpc, p.cpc) : null },
    { key: "spend", header: "Spent", align: "right",
      render: (r) => fmtMoney(r.spend),
      delta: (c, p) => p ? pctDelta(c.spend, p.spend) : null },
    { key: "purchases", header: "Purchases", align: "right",
      render: (r) => fmtNumber(r.websitePurchases),
      delta: (c, p) => p ? pctDelta(c.websitePurchases, p.websitePurchases) : null },
    { key: "conv", header: "Conv. value", align: "right",
      render: (r) => fmtMoney(r.convValue),
      delta: (c, p) => p ? pctDelta(c.convValue, p.convValue) : null },
    { key: "roas", header: "ROAS", align: "right",
      render: (r) => r.roas.toFixed(2),
      delta: (c, p) => p ? pctDelta(c.roas, p.roas) : null },
  ];

  function bkCols(label: string): Col<Bk>[] {
    return [
      { key: "dim1", header: label, render: (r) => <span className="text-xs">{r.dim1}</span> },
      { key: "spend", header: "Spend", align: "right",
        render: (r) => fmtMoney(r.spend),
        delta: (c, p) => p ? pctDelta(c.spend, p.spend) : null },
      { key: "purchases", header: "Purchase", align: "right",
        render: (r) => fmtNumber(r.purchases),
        delta: (c, p) => p ? pctDelta(c.purchases, p.purchases) : null },
      { key: "conv", header: "Conv. value", align: "right",
        render: (r) => fmtMoney(r.convValue),
        delta: (c, p) => p ? pctDelta(c.convValue, p.convValue) : null },
      { key: "roas", header: "ROAS", align: "right",
        render: (r) => r.roas.toFixed(2),
        delta: (c, p) => p ? pctDelta(c.roas, p.roas) : null },
    ];
  }

  const countryCols  = bkCols("Country");
  const platformCols = bkCols("Publisher platform");
  const promotedCols = bkCols("Promoted object");
  const landingCols  = bkCols("Landing page");

  // Aggregate age_gender into two pies: gender, age
  const genderAgg = new Map<string, number>();
  const ageAgg = new Map<string, number>();
  for (const r of byAgeGender) {
    // dim1 = age range, dim2 = gender (per schema convention)
    const age = r.dim1;
    const gender = r.dim2 || "unknown";
    ageAgg.set(age, (ageAgg.get(age) ?? 0) + r.convValue);
    genderAgg.set(gender, (genderAgg.get(gender) ?? 0) + r.convValue);
  }
  const genderSlices = mapToSlices(genderAgg);
  const ageSlices = mapToSlices(ageAgg);
  const deviceSlices = mapToSlices(
    new Map(byDevice.map((r) => [r.dim1, r.convValue]))
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <DateRangeBar
          active={days}
          from={from}
          to={to}
          basePath="/reports/meta"
          projectSlug={project.slug}
          keepParams={{ meta_account: accountId }}
        />
        <Freshness meta={fresh.meta} />
      </div>
      <AdAccountSwitcher
        label="Meta 账户"
        paramName="meta_account"
        accounts={accounts.map((a) => ({ id: a.accountId, name: a.accountName }))}
      />

      <section>
        <div className="text-xs text-zinc-500 mb-3">Including data from Facebook, Instagram, Messenger, WhatsApp and Threads</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi
            label="Purchase conversion value"
            value={fmtCompact(meta.purchaseConvValue)}
            delta={pctDelta(meta.purchaseConvValue, prevMeta.purchaseConvValue)}
          />
          <Kpi
            label="Amount spent"
            value={fmtCompact(meta.spend)}
            delta={pctDelta(meta.spend, prevMeta.spend)}
          />
          <Kpi label="ROAS" value={meta.roas.toFixed(2)} delta={pctDelta(meta.roas, prevMeta.roas)} />
          <Kpi
            label="Avg. order value"
            value={fmtMoney(meta.purchases > 0 ? meta.purchaseConvValue / meta.purchases : 0)}
            delta={null}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mt-3">
          <Kpi size="sm" label="Omni adds to cart" value={fmtCompact(meta.addsToCart)} delta={pctDelta(meta.addsToCart, prevMeta.addsToCart)} />
          <Kpi size="sm" label="Omni initiated checkouts" value={fmtCompact(meta.initiatedCheckouts)} delta={pctDelta(meta.initiatedCheckouts, prevMeta.initiatedCheckouts)} />
          <Kpi size="sm" label="Omni purchases" value={fmtCompact(meta.purchases)} delta={pctDelta(meta.purchases, prevMeta.purchases)} />
          <Kpi size="sm" label="Impressions" value={fmtCompact(Number(meta.impressions))} delta={pctDelta(Number(meta.impressions), Number(prevMeta.impressions))} />
          <Kpi size="sm" label="Clicks (all)" value={fmtCompact(Number(meta.clicks))} delta={pctDelta(Number(meta.clicks), Number(prevMeta.clicks))} />
          <Kpi size="sm" label="CPC (all)" value={meta.cpc.toFixed(2)} delta={null} />
          <Kpi size="sm" label="CPM" value={meta.cpm.toFixed(0)} delta={null} />
        </div>
      </section>

      <section>
        <h2 className="text-base font-medium mb-3">Meta ads conv. value vs cost</h2>
        <LineChart
          labels={series.map((s) => s.date)}
          series={[
            { name: "Conv. value", color: "#3b82f6", values: series.map((s) => s.v1) },
            { name: "Cost", color: "#10b981", values: series.map((s) => s.v2) },
          ]}
        />
      </section>

      <DataTable
        title={`Campaigns (top ${campaigns.length})`}
        rows={campaigns}
        cols={campCols}
        prevRows={prevCampaigns}
        identity={(r) => r.campaignId}
        totalsRow={campTotal}
        prevTotalsRow={prevCampTotal}
        maxHeight={500}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable
          title="Country / Territory"
          rows={byCountry}
          cols={countryCols}
          prevRows={prevByCountry}
          identity={(r) => r.dim1}
          totalsRow={countryTotal}
          prevTotalsRow={prevCountryTotal}
          maxHeight={500}
        />
        <DataTable
          title="Publisher platform"
          rows={byPlatform}
          cols={platformCols}
          prevRows={prevByPlatform}
          identity={(r) => r.dim1}
          totalsRow={platformTotal}
          prevTotalsRow={prevPlatformTotal}
          maxHeight={500}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable
          title="Promoted object"
          rows={byPromoted}
          cols={promotedCols}
          prevRows={prevByPromoted}
          identity={(r) => r.dim1}
          totalsRow={promotedTotal}
          prevTotalsRow={prevPromotedTotal}
          maxHeight={500}
        />
        <DataTable
          title="Landing page"
          rows={byLanding}
          cols={landingCols}
          prevRows={prevByLanding}
          identity={(r) => r.dim1}
          totalsRow={landingTotal}
          prevTotalsRow={prevLandingTotal}
          maxHeight={500}
        />
      </div>

      <section>
        <h2 className="text-base font-medium mb-3">Conv. value breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
          <div>
            <div className="text-sm text-zinc-500 mb-2">Gender</div>
            <PieChart slices={genderSlices} />
          </div>
          <div>
            <div className="text-sm text-zinc-500 mb-2">Age</div>
            <PieChart slices={ageSlices} />
          </div>
          <div>
            <div className="text-sm text-zinc-500 mb-2">Device</div>
            <PieChart slices={deviceSlices} />
          </div>
        </div>
      </section>

      <DataTable
        title={`Creatives (top ${creatives.length})`}
        rows={creatives}
        cols={creativeCols}
        prevRows={prevCreatives}
        identity={(r) => r.adId}
        totalsRow={creativeTotal}
        prevTotalsRow={prevCreativeTotal}
        maxHeight={600}
      />
    </div>
  );
}

function mapToSlices(m: Map<string, number>) {
  const entries = Array.from(m.entries())
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const colors = autoColors(entries.length);
  return entries.map(([label, value], i) => ({ label, value, color: colors[i] }));
}

// ---- Group view: aggregated Meta KPIs across all member projects ----
type GroupProject = { id: string; slug: string; name: string; dbName: string };
type MetaGroupProps = {
  group: { id: string; slug: string; name: string; projects: GroupProject[] };
  params: { days?: string; from?: string; to?: string; project?: string };
};

type MetaProjectRow = {
  projectName: string;
  spend: number;
  convValue: number;
  purchases: number;
  addsToCart: number;
  initiatedCheckouts: number;
  roas: number;
};

async function MetaGroupView({ group, params }: MetaGroupProps) {
  const ctxs: ProjectQueryContext[] = group.projects.map((p) => ({
    client: projectClient(p.dbName),
    tenantId: p.id,
  }));
  const { range, days, from, to } = resolveRange(params);
  const prev = previousRange(range);

  const [meta, prevMeta, series, fresh, perProject] = await Promise.all([
    metaAggregateMulti(ctxs, range),
    metaAggregateMulti(ctxs, prev),
    metaDailySeriesMulti(ctxs, range),
    lastFetchedAtMulti(ctxs),
    Promise.all(group.projects.map(async (p) => {
      const c: ProjectQueryContext = { client: projectClient(p.dbName), tenantId: p.id };
      const m = await metaAggregate(c, range);
      return {
        projectName: p.name,
        spend: m.spend,
        convValue: m.purchaseConvValue,
        purchases: m.purchases,
        addsToCart: m.addsToCart,
        initiatedCheckouts: m.initiatedCheckouts,
        roas: m.roas,
      } satisfies MetaProjectRow;
    })),
  ]);

  const projectCols: Col<MetaProjectRow>[] = [
    { key: "project", header: "项目", render: (r) => r.projectName },
    { key: "spend", header: "Spend", align: "right", render: (r) => fmtMoney(r.spend) },
    { key: "convValue", header: "Purchase conv. value", align: "right", render: (r) => fmtMoney(r.convValue) },
    { key: "purchases", header: "Omni purchases", align: "right", render: (r) => fmtNumber(r.purchases) },
    { key: "atc", header: "Omni ATC", align: "right", render: (r) => fmtNumber(r.addsToCart) },
    { key: "ic", header: "Omni IC", align: "right", render: (r) => fmtNumber(r.initiatedCheckouts) },
    { key: "roas", header: "ROAS", align: "right", render: (r) => r.roas.toFixed(2) },
  ];
  const projectTotal: MetaProjectRow = {
    projectName: "总计",
    spend: meta.spend,
    convValue: meta.purchaseConvValue,
    purchases: meta.purchases,
    addsToCart: meta.addsToCart,
    initiatedCheckouts: meta.initiatedCheckouts,
    roas: meta.roas,
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <DateRangeBar active={days} from={from} to={to} basePath="/reports/meta" projectSlug={group.slug} />
        <Freshness meta={fresh.meta} />
      </div>
      <div className="text-xs text-zinc-500">
        合计视图 · {group.projects.length} 个项目 · 所有金额已统一为 USD · 单项目下钻请切换具体项目查看
      </div>

      <section>
        <div className="text-xs text-zinc-500 mb-3">Including data from Facebook, Instagram, Messenger, WhatsApp and Threads</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Purchase conversion value" value={fmtCompact(meta.purchaseConvValue)} delta={pctDelta(meta.purchaseConvValue, prevMeta.purchaseConvValue)} />
          <Kpi label="Amount spent" value={fmtCompact(meta.spend)} delta={pctDelta(meta.spend, prevMeta.spend)} />
          <Kpi label="ROAS" value={meta.roas.toFixed(2)} delta={pctDelta(meta.roas, prevMeta.roas)} />
          <Kpi label="Avg. order value"
            value={fmtMoney(meta.purchases > 0 ? meta.purchaseConvValue / meta.purchases : 0)}
            delta={null} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mt-3">
          <Kpi size="sm" label="Omni adds to cart" value={fmtCompact(meta.addsToCart)} delta={pctDelta(meta.addsToCart, prevMeta.addsToCart)} />
          <Kpi size="sm" label="Omni initiated checkouts" value={fmtCompact(meta.initiatedCheckouts)} delta={pctDelta(meta.initiatedCheckouts, prevMeta.initiatedCheckouts)} />
          <Kpi size="sm" label="Omni purchases" value={fmtCompact(meta.purchases)} delta={pctDelta(meta.purchases, prevMeta.purchases)} />
          <Kpi size="sm" label="Impressions" value={fmtCompact(meta.impressions)} delta={pctDelta(meta.impressions, prevMeta.impressions)} />
          <Kpi size="sm" label="Clicks (all)" value={fmtCompact(meta.clicks)} delta={pctDelta(meta.clicks, prevMeta.clicks)} />
          <Kpi size="sm" label="CPC (all)" value={meta.cpc.toFixed(2)} delta={null} />
          <Kpi size="sm" label="CPM" value={meta.cpm.toFixed(0)} delta={null} />
        </div>
      </section>

      <section>
        <h2 className="text-base font-medium mb-3">Meta ads conv. value vs cost</h2>
        <LineChart
          labels={series.map((s) => s.date)}
          series={[
            { name: "Conv. value", color: "#3b82f6", values: series.map((s) => s.v1) },
            { name: "Cost", color: "#10b981", values: series.map((s) => s.v2) },
          ]}
        />
      </section>

      <section>
        <DataTable
          title="各项目贡献"
          rows={perProject}
          cols={projectCols}
          identity={(r) => r.projectName}
          totalsRow={projectTotal}
          maxHeight={500}
        />
      </section>
    </div>
  );
}
