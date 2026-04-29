import { auth } from "@/auth";
import { getPrimaryTenant } from "@/lib/tenant";
import {
  defaultRange,
  previousRange,
  pctDelta,
  googleAggregate,
  googleDailySeries,
  googleCampaignTypeAggregate,
  googleBreakdownTop,
  lastFetchedAt,
} from "@/lib/insights/queries";
import { Kpi, fmtCompact, fmtMoney, fmtPct, fmtNumber } from "@/components/insights/Kpi";
import { LineChart } from "@/components/insights/LineChart";
import { DataTable, Col } from "@/components/insights/DataTable";
import { DateRangeBar } from "@/components/insights/DateRangeBar";
import { PieChart, autoColors } from "@/components/insights/PieChart";
import { Freshness } from "@/components/insights/Freshness";

export default async function GoogleReportPage({
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

  const [
    google,
    prevGoogle,
    series,
    byType,
    searchTermsSearch,
    searchTermsShopping,
    products,
    finalUrls,
    country,
    convGender,
    convAge,
    convDevice,
    fresh,
  ] = await Promise.all([
    googleAggregate(tenant.id, range),
    googleAggregate(tenant.id, prev),
    googleDailySeries(tenant.id, range),
    googleCampaignTypeAggregate(tenant.id, range),
    googleBreakdownTop(tenant.id, range, "search_term_search", 15),
    googleBreakdownTop(tenant.id, range, "search_term_shopping", 15),
    googleBreakdownTop(tenant.id, range, "top_product_shopping", 10),
    googleBreakdownTop(tenant.id, range, "final_url", 10),
    googleBreakdownTop(tenant.id, range, "country", 10),
    googleBreakdownTop(tenant.id, range, "conv_value_gender", 10),
    googleBreakdownTop(tenant.id, range, "conv_value_age", 20),
    googleBreakdownTop(tenant.id, range, "conv_value_device", 10),
    lastFetchedAt(tenant.id),
  ]);

  type Type = (typeof byType)[number];
  const typeCols: Col<Type>[] = [
    { key: "t", header: "Campaign type", render: (r) => r.campaignType },
    { key: "clicks", header: "Clicks", render: (r) => fmtCompact(Number(r.clicks)), align: "right" },
    { key: "cost", header: "Cost", render: (r) => fmtMoney(r.cost), align: "right" },
    { key: "purchases", header: "Purchase", render: (r) => fmtNumber(r.purchases), align: "right" },
    { key: "conv", header: "Conv. value", render: (r) => fmtMoney(r.convValue), align: "right" },
    { key: "roas", header: "ROAS", render: (r) => r.roas.toFixed(2), align: "right" },
  ];

  type Bk = (typeof searchTermsSearch)[number];
  const searchTermCols: Col<Bk>[] = [
    { key: "term", header: "Search term", render: (r) => <span className="text-xs">{r.dim1}</span> },
    { key: "clicks", header: "Clicks", render: (r) => fmtNumber(Number(r.clicks)), align: "right" },
    { key: "cost", header: "Cost", render: (r) => fmtMoney(r.cost), align: "right" },
    { key: "purchases", header: "Purchase", render: (r) => fmtNumber(r.purchases), align: "right" },
    { key: "conv", header: "Conv. value", render: (r) => fmtMoney(r.totalConvValue), align: "right" },
  ];

  const productCols: Col<Bk>[] = [
    { key: "p", header: "Product", render: (r) => <span className="text-xs">{r.dim1.slice(0, 80)}</span> },
    { key: "clicks", header: "Clicks", render: (r) => fmtNumber(Number(r.clicks)), align: "right" },
    { key: "cost", header: "Cost", render: (r) => fmtMoney(r.cost), align: "right" },
    { key: "purchases", header: "Purchase", render: (r) => fmtNumber(r.purchases), align: "right" },
    { key: "conv", header: "All conv. value", render: (r) => fmtMoney(r.allConvValue), align: "right" },
  ];

  const finalUrlCols: Col<Bk>[] = [
    { key: "ch", header: "Channel", render: (r) => r.dim2 || "—" },
    { key: "url", header: "Final URL", render: (r) => <span className="text-xs">{r.dim1}</span> },
    { key: "clicks", header: "Clicks", render: (r) => fmtNumber(Number(r.clicks)), align: "right" },
    { key: "cost", header: "Cost", render: (r) => fmtMoney(r.cost), align: "right" },
    { key: "conv", header: "Conv. value", render: (r) => fmtMoney(r.totalConvValue), align: "right" },
  ];

  const countryCols: Col<Bk>[] = [
    { key: "c", header: "Country", render: (r) => r.dim1 },
    { key: "cost", header: "Cost", render: (r) => fmtMoney(r.cost), align: "right" },
    { key: "purchases", header: "Purchase", render: (r) => fmtNumber(r.purchases), align: "right" },
    { key: "conv", header: "Conv. value", render: (r) => fmtMoney(r.totalConvValue), align: "right" },
    { key: "roas", header: "ROAS", render: (r) => r.roas.toFixed(2), align: "right" },
  ];

  const genderSlices = bkToSlices(convGender);
  const ageSlices = bkToSlices(convAge);
  const deviceSlices = bkToSlices(convDevice);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <DateRangeBar active={days} basePath="/reports/google" />
        <Freshness google={fresh.google} />
      </div>

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

      <DataTable title="Top campaign types" rows={byType} cols={typeCols} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable title="Top search terms — Search Ads" rows={searchTermsSearch} cols={searchTermCols} />
        <DataTable title="Top search terms — Shopping Ads" rows={searchTermsShopping} cols={searchTermCols} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable title="Top products — Shopping Ads" rows={products} cols={productCols} />
        <DataTable title="Final URLs" rows={finalUrls} cols={finalUrlCols} />
      </div>

      <DataTable title="Top country / territory" rows={country} cols={countryCols} />

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

function parsePositiveInt(v: string | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 && n <= 365 ? n : fallback;
}
