import { auth } from "@/auth";
import { resolveCurrentProject } from "@/lib/db/currentProject";
import { projectClient } from "@/lib/db/projectClient";
import {
  resolveRange,
  previousRange,
  pctDelta,
  googleAggregate,
  googleDailySeries,
  googleCampaignTypeAggregate,
  googleBreakdownTop,
  lastFetchedAt,
  listGoogleAccounts,
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

export default async function GoogleReportPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string; project?: string; google_account?: string }>;
}) {
  const session = await auth();
  const userId = (session!.user as { id?: string }).id!;
  const params = await searchParams;
  const { project } = await resolveCurrentProject({ userId, urlSlug: params.project ?? null });
  if (!project) {
    return (
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-12 text-center text-zinc-500 space-y-4">
        <div>当前账号没有任何已审核通过的项目权限。</div>
        <a href="/apply" className="inline-block rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">
          去申请项目权限
        </a>
      </div>
    );
  }

  const client = projectClient(project.dbName);
  const customerId = params.google_account || null;
  const ctx: ProjectQueryContext = {
    client,
    tenantId: project.id,
    googleCustomerId: customerId,
  };
  const accounts = await listGoogleAccounts({ client, tenantId: project.id });

  const { range, days, from, to } = resolveRange(params);
  const prev = previousRange(range);

  const [
    google,
    prevGoogle,
    series,
    byType, prevByType,
    searchTermsSearch, prevSearchTermsSearch,
    searchTermsShopping, prevSearchTermsShopping,
    products, prevProducts,
    finalUrls, prevFinalUrls,
    country, prevCountry,
    convGender,
    convAge,
    convDevice,
    fresh,
  ] = await Promise.all([
    googleAggregate(ctx, range),
    googleAggregate(ctx, prev),
    googleDailySeries(ctx, range),
    googleCampaignTypeAggregate(ctx, range),
    googleCampaignTypeAggregate(ctx, prev),
    googleBreakdownTop(ctx, range, "search_term_search", 30),
    googleBreakdownTop(ctx, prev, "search_term_search", 200),
    googleBreakdownTop(ctx, range, "search_term_shopping", 30),
    googleBreakdownTop(ctx, prev, "search_term_shopping", 200),
    googleBreakdownTop(ctx, range, "top_product_shopping", 20),
    googleBreakdownTop(ctx, prev, "top_product_shopping", 100),
    googleBreakdownTop(ctx, range, "final_url", 20),
    googleBreakdownTop(ctx, prev, "final_url", 100),
    googleBreakdownTop(ctx, range, "country", 30),
    googleBreakdownTop(ctx, prev, "country", 100),
    googleBreakdownTop(ctx, range, "conv_value_gender", 10),
    googleBreakdownTop(ctx, range, "conv_value_age", 20),
    googleBreakdownTop(ctx, range, "conv_value_device", 10),
    lastFetchedAt(ctx),
  ]);

  type Type = (typeof byType)[number];
  type Bk = (typeof searchTermsSearch)[number];

  function typeTotals(arr: Type[]): Type {
    const t = sumNumeric(arr, {
      campaignType: "总计",
      clicks: 0,
      cost: 0,
      purchases: 0,
      convValue: 0,
      roas: 0,
    } as Type);
    return { ...t, roas: t.cost > 0 ? t.convValue / t.cost : 0 };
  }
  function bkTotals(arr: Bk[]): Bk {
    const t = sumNumeric(arr, {
      dim1: "总计",
      dim2: "",
      clicks: 0,
      cost: 0,
      purchases: 0,
      totalConvValue: 0,
      allConvValue: 0,
      roas: 0,
    } as Bk);
    return { ...t, roas: t.cost > 0 ? t.totalConvValue / t.cost : 0 };
  }
  const byTypeTotal = typeTotals(byType);
  const prevByTypeTotal = typeTotals(prevByType);
  const sttSearchTotal = bkTotals(searchTermsSearch);
  const prevSttSearchTotal = bkTotals(prevSearchTermsSearch);
  const sttShopTotal = bkTotals(searchTermsShopping);
  const prevSttShopTotal = bkTotals(prevSearchTermsShopping);
  const productsTotal = bkTotals(products);
  const prevProductsTotal = bkTotals(prevProducts);
  const finalUrlsTotal = bkTotals(finalUrls);
  const prevFinalUrlsTotal = bkTotals(prevFinalUrls);
  const countryTotal = bkTotals(country);
  const prevCountryTotal = bkTotals(prevCountry);

  const typeCols: Col<Type>[] = [
    { key: "t", header: "Campaign type", render: (r) => r.campaignType },
    { key: "clicks", header: "Clicks", align: "right",
      render: (r) => fmtCompact(Number(r.clicks)),
      delta: (c, p) => p ? pctDelta(Number(c.clicks), Number(p.clicks)) : null },
    { key: "cost", header: "Cost", align: "right",
      render: (r) => fmtMoney(r.cost),
      delta: (c, p) => p ? pctDelta(c.cost, p.cost) : null },
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

  const searchTermCols: Col<Bk>[] = [
    { key: "term", header: "Search term", render: (r) => <span className="text-xs">{r.dim1}</span> },
    { key: "clicks", header: "Clicks", align: "right",
      render: (r) => fmtNumber(Number(r.clicks)),
      delta: (c, p) => p ? pctDelta(Number(c.clicks), Number(p.clicks)) : null },
    { key: "cost", header: "Cost", align: "right",
      render: (r) => fmtMoney(r.cost),
      delta: (c, p) => p ? pctDelta(c.cost, p.cost) : null },
    { key: "purchases", header: "Purchase", align: "right",
      render: (r) => fmtNumber(r.purchases),
      delta: (c, p) => p ? pctDelta(c.purchases, p.purchases) : null },
    { key: "conv", header: "Conv. value", align: "right",
      render: (r) => fmtMoney(r.totalConvValue),
      delta: (c, p) => p ? pctDelta(c.totalConvValue, p.totalConvValue) : null },
  ];

  const productCols: Col<Bk>[] = [
    { key: "p", header: "Product", render: (r) => <span className="text-xs">{r.dim1.slice(0, 80)}</span> },
    { key: "clicks", header: "Clicks", align: "right",
      render: (r) => fmtNumber(Number(r.clicks)),
      delta: (c, p) => p ? pctDelta(Number(c.clicks), Number(p.clicks)) : null },
    { key: "cost", header: "Cost", align: "right",
      render: (r) => fmtMoney(r.cost),
      delta: (c, p) => p ? pctDelta(c.cost, p.cost) : null },
    { key: "purchases", header: "Purchase", align: "right",
      render: (r) => fmtNumber(r.purchases),
      delta: (c, p) => p ? pctDelta(c.purchases, p.purchases) : null },
    { key: "conv", header: "All conv. value", align: "right",
      render: (r) => fmtMoney(r.allConvValue),
      delta: (c, p) => p ? pctDelta(c.allConvValue, p.allConvValue) : null },
  ];

  const finalUrlCols: Col<Bk>[] = [
    { key: "ch", header: "Channel", render: (r) => r.dim2 || "—" },
    { key: "url", header: "Final URL", render: (r) => <span className="text-xs">{r.dim1}</span> },
    { key: "clicks", header: "Clicks", align: "right",
      render: (r) => fmtNumber(Number(r.clicks)),
      delta: (c, p) => p ? pctDelta(Number(c.clicks), Number(p.clicks)) : null },
    { key: "cost", header: "Cost", align: "right",
      render: (r) => fmtMoney(r.cost),
      delta: (c, p) => p ? pctDelta(c.cost, p.cost) : null },
    { key: "conv", header: "Conv. value", align: "right",
      render: (r) => fmtMoney(r.totalConvValue),
      delta: (c, p) => p ? pctDelta(c.totalConvValue, p.totalConvValue) : null },
  ];

  const countryCols: Col<Bk>[] = [
    { key: "c", header: "Country", render: (r) => r.dim1 },
    { key: "cost", header: "Cost", align: "right",
      render: (r) => fmtMoney(r.cost),
      delta: (c, p) => p ? pctDelta(c.cost, p.cost) : null },
    { key: "purchases", header: "Purchase", align: "right",
      render: (r) => fmtNumber(r.purchases),
      delta: (c, p) => p ? pctDelta(c.purchases, p.purchases) : null },
    { key: "conv", header: "Conv. value", align: "right",
      render: (r) => fmtMoney(r.totalConvValue),
      delta: (c, p) => p ? pctDelta(c.totalConvValue, p.totalConvValue) : null },
    { key: "roas", header: "ROAS", align: "right",
      render: (r) => r.roas.toFixed(2),
      delta: (c, p) => p ? pctDelta(c.roas, p.roas) : null },
  ];

  const genderSlices = bkToSlices(convGender);
  const ageSlices = bkToSlices(convAge);
  const deviceSlices = bkToSlices(convDevice);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <DateRangeBar
          active={days}
          from={from}
          to={to}
          basePath="/reports/google"
          projectSlug={project.slug}
          keepParams={{ google_account: customerId }}
        />
        <Freshness google={fresh.google} />
      </div>
      <AdAccountSwitcher
        label="Google 账户"
        paramName="google_account"
        accounts={accounts.map((a) => ({ id: a.customerId, name: a.customerName }))}
      />

      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi
            label="Total conv. value"
            value={fmtCompact(google.totalConvValue)}
            delta={pctDelta(google.totalConvValue, prevGoogle.totalConvValue)}
          />
          <Kpi
            label="Cost"
            value={fmtCompact(google.cost)}
            delta={pctDelta(google.cost, prevGoogle.cost)}
          />
          <Kpi
            label="Conv. value / cost"
            value={google.roas.toFixed(2)}
            delta={pctDelta(google.roas, prevGoogle.roas)}
          />
          <Kpi
            label="Value / all conv."
            value={(google.purchases > 0 ? google.totalConvValue / google.purchases : 0).toFixed(0)}
            delta={null}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mt-3">
          <Kpi size="sm" label="Add to cart" value={fmtCompact(google.addsToCart)} delta={pctDelta(google.addsToCart, prevGoogle.addsToCart)} />
          <Kpi size="sm" label="Begin checkout" value={fmtCompact(google.beginsCheckout)} delta={pctDelta(google.beginsCheckout, prevGoogle.beginsCheckout)} />
          <Kpi size="sm" label="Purchase" value={fmtCompact(google.purchases)} delta={pctDelta(google.purchases, prevGoogle.purchases)} />
          <Kpi size="sm" label="Impressions" value={fmtCompact(Number(google.impressions))} delta={pctDelta(Number(google.impressions), Number(prevGoogle.impressions))} />
          <Kpi size="sm" label="Clicks" value={fmtCompact(Number(google.clicks))} delta={pctDelta(Number(google.clicks), Number(prevGoogle.clicks))} />
          <Kpi size="sm" label="Avg. CPC" value={google.cpc.toFixed(2)} delta={null} />
          <Kpi size="sm" label="CTR" value={fmtPct(google.ctr, 2)} delta={null} />
        </div>
      </section>

      <section>
        <h2 className="text-base font-medium mb-3">Google ads conv. value vs cost</h2>
        <LineChart
          labels={series.map((s) => s.date)}
          series={[
            { name: "Conv. value", color: "#3b82f6", values: series.map((s) => s.v1) },
            { name: "Cost", color: "#10b981", values: series.map((s) => s.v2) },
          ]}
        />
      </section>

      <DataTable
        title="Top campaign types"
        rows={byType}
        cols={typeCols}
        prevRows={prevByType}
        identity={(r) => r.campaignType}
        totalsRow={byTypeTotal}
        prevTotalsRow={prevByTypeTotal}
        maxHeight={500}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable
          title="Top search terms — Search Ads"
          rows={searchTermsSearch}
          cols={searchTermCols}
          prevRows={prevSearchTermsSearch}
          identity={(r) => r.dim1}
          totalsRow={sttSearchTotal}
          prevTotalsRow={prevSttSearchTotal}
          maxHeight={500}
        />
        <DataTable
          title="Top search terms — Shopping Ads"
          rows={searchTermsShopping}
          cols={searchTermCols}
          prevRows={prevSearchTermsShopping}
          identity={(r) => r.dim1}
          totalsRow={sttShopTotal}
          prevTotalsRow={prevSttShopTotal}
          maxHeight={500}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable
          title="Top products — Shopping Ads"
          rows={products}
          cols={productCols}
          prevRows={prevProducts}
          identity={(r) => r.dim1}
          totalsRow={productsTotal}
          prevTotalsRow={prevProductsTotal}
          maxHeight={500}
        />
        <DataTable
          title="Final URLs"
          rows={finalUrls}
          cols={finalUrlCols}
          prevRows={prevFinalUrls}
          identity={(r) => `${r.dim1}|${r.dim2}`}
          totalsRow={finalUrlsTotal}
          prevTotalsRow={prevFinalUrlsTotal}
          maxHeight={500}
        />
      </div>

      <DataTable
        title="Top country / territory"
        rows={country}
        cols={countryCols}
        prevRows={prevCountry}
        identity={(r) => r.dim1}
        totalsRow={countryTotal}
        prevTotalsRow={prevCountryTotal}
        maxHeight={500}
      />

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
    </div>
  );
}

function bkToSlices(rows: Array<{ dim1: string; totalConvValue: number }>) {
  const filtered = rows.filter((r) => r.totalConvValue > 0);
  const colors = autoColors(filtered.length);
  return filtered.map((r, i) => ({
    label: r.dim1,
    value: r.totalConvValue,
    color: colors[i],
  }));
}
