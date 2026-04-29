import { auth } from "@/auth";
import { getPrimaryTenant } from "@/lib/tenant";
import {
  defaultRange,
  previousRange,
  pctDelta,
  metaAggregate,
  metaDailySeries,
  topMetaCampaigns,
  topMetaCreatives,
  metaBreakdownTop,
  lastFetchedAt,
} from "@/lib/insights/queries";
import { Kpi, fmtCompact, fmtMoney, fmtPct, fmtNumber } from "@/components/insights/Kpi";
import { LineChart } from "@/components/insights/LineChart";
import { DataTable, Col } from "@/components/insights/DataTable";
import { DateRangeBar } from "@/components/insights/DateRangeBar";
import { PieChart, autoColors } from "@/components/insights/PieChart";
import { Freshness } from "@/components/insights/Freshness";

export default async function MetaReportPage({
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
    meta,
    prevMeta,
    series,
    campaigns,
    creatives,
    byCountry,
    byPlatform,
    byPromoted,
    byLanding,
    byAgeGender,
    byDevice,
    fresh,
  ] = await Promise.all([
    metaAggregate(tenant.id, range),
    metaAggregate(tenant.id, prev),
    metaDailySeries(tenant.id, range),
    topMetaCampaigns(tenant.id, range, 30),
    topMetaCreatives(tenant.id, range, 20),
    metaBreakdownTop(tenant.id, range, "country", 15),
    metaBreakdownTop(tenant.id, range, "publisher_platform", 10),
    metaBreakdownTop(tenant.id, range, "promoted_object", 10),
    metaBreakdownTop(tenant.id, range, "landing_page", 10),
    metaBreakdownTop(tenant.id, range, "age_gender", 50),
    metaBreakdownTop(tenant.id, range, "device_platform", 10),
    lastFetchedAt(tenant.id),
  ]);

  type Camp = (typeof campaigns)[number];
  const campCols: Col<Camp>[] = [
    { key: "name", header: "Campaign name", render: (r) => <span className="text-xs">{r.campaignName}</span> },
    { key: "clicks", header: "Clicks", render: (r) => fmtCompact(Number(r.clicks)), align: "right" },
    { key: "spend", header: "Spend", render: (r) => fmtMoney(r.spend), align: "right" },
    { key: "purchases", header: "Purchase", render: (r) => fmtNumber(r.purchases), align: "right" },
    { key: "conv", header: "Conv. value", render: (r) => fmtMoney(r.convValue), align: "right" },
    { key: "roas", header: "ROAS", render: (r) => r.roas.toFixed(2), align: "right" },
  ];

  type Creative = (typeof creatives)[number];
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
    { key: "cpm", header: "CPM", render: (r) => r.cpm.toFixed(0), align: "right" },
    { key: "ctr", header: "CTR", render: (r) => fmtPct(r.ctr, 1), align: "right" },
    { key: "cpc", header: "CPC", render: (r) => r.cpc.toFixed(2), align: "right" },
    { key: "spend", header: "Spent", render: (r) => fmtMoney(r.spend), align: "right" },
    { key: "purchases", header: "Purchases", render: (r) => fmtNumber(r.websitePurchases), align: "right" },
    { key: "conv", header: "Conv. value", render: (r) => fmtMoney(r.convValue), align: "right" },
    { key: "roas", header: "ROAS", render: (r) => r.roas.toFixed(2), align: "right" },
  ];

  type Bk = (typeof byCountry)[number];
  const countryCols: Col<Bk>[] = [
    { key: "country", header: "Country", render: (r) => r.dim1 },
    { key: "spend", header: "Amount spent", render: (r) => fmtMoney(r.spend), align: "right" },
    { key: "purchases", header: "Purchase", render: (r) => fmtNumber(r.purchases), align: "right" },
    { key: "conv", header: "Conv. value", render: (r) => fmtMoney(r.convValue), align: "right" },
    { key: "roas", header: "ROAS", render: (r) => r.roas.toFixed(2), align: "right" },
  ];

  const platformCols: Col<Bk>[] = [
    { key: "p", header: "Publisher platform", render: (r) => r.dim1 },
    { key: "spend", header: "Spend", render: (r) => fmtMoney(r.spend), align: "right" },
    { key: "purchases", header: "Purchase", render: (r) => fmtNumber(r.purchases), align: "right" },
    { key: "conv", header: "Conv. value", render: (r) => fmtMoney(r.convValue), align: "right" },
    { key: "roas", header: "ROAS", render: (r) => r.roas.toFixed(2), align: "right" },
  ];

  const promotedCols: Col<Bk>[] = [
    { key: "p", header: "Promoted object", render: (r) => <span className="text-xs">{r.dim1}</span> },
    { key: "spend", header: "Spend", render: (r) => fmtMoney(r.spend), align: "right" },
    { key: "purchases", header: "Purchase", render: (r) => fmtNumber(r.purchases), align: "right" },
    { key: "conv", header: "Conv. value", render: (r) => fmtMoney(r.convValue), align: "right" },
    { key: "roas", header: "ROAS", render: (r) => r.roas.toFixed(2), align: "right" },
  ];

  const landingCols: Col<Bk>[] = [
    { key: "u", header: "Landing page", render: (r) => <span className="text-xs">{r.dim1}</span> },
    { key: "spend", header: "Spend", render: (r) => fmtMoney(r.spend), align: "right" },
    { key: "purchases", header: "Purchase", render: (r) => fmtNumber(r.purchases), align: "right" },
    { key: "conv", header: "Conv. value", render: (r) => fmtMoney(r.convValue), align: "right" },
    { key: "roas", header: "ROAS", render: (r) => r.roas.toFixed(2), align: "right" },
  ];

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
        <DateRangeBar active={days} basePath="/reports/meta" />
        <Freshness meta={fresh.meta} />
      </div>

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

      <DataTable title={`Campaigns (top ${campaigns.length})`} rows={campaigns} cols={campCols} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable title="Country / Territory" rows={byCountry} cols={countryCols} />
        <DataTable title="Publisher platform" rows={byPlatform} cols={platformCols} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataTable title="Promoted object" rows={byPromoted} cols={promotedCols} />
        <DataTable title="Landing page" rows={byLanding} cols={landingCols} />
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

      <DataTable title={`Creatives (top ${creatives.length})`} rows={creatives} cols={creativeCols} />
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

function parsePositiveInt(v: string | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 && n <= 365 ? n : fallback;
}
