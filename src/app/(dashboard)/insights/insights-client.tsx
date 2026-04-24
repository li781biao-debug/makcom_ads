"use client";
import { useState } from "react";

interface Account {
  actId: string;
  name: string;
}

interface InsightRow {
  data?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  cpm?: string;
  ctr?: string;
  campaign_name?: string;
  date_start?: string;
  date_stop?: string;
}

const DATE_PRESETS = [
  { value: "today", label: "今天" },
  { value: "yesterday", label: "昨天" },
  { value: "last_3d", label: "最近 3 天" },
  { value: "last_7d", label: "最近 7 天" },
  { value: "last_14d", label: "最近 14 天" },
  { value: "last_30d", label: "最近 30 天" },
  { value: "this_month", label: "本月" },
  { value: "last_month", label: "上月" },
];

function parseRow(row: InsightRow): InsightRow {
  if (row.data && typeof row.data === "string") {
    try {
      return { ...row, ...JSON.parse(row.data) };
    } catch {
      return row;
    }
  }
  return row;
}

export default function InsightsClient({ accounts }: { accounts: Account[] }) {
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.actId ?? "");
  const [datePreset, setDatePreset] = useState("last_7d");
  const [level, setLevel] = useState("campaign");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<InsightRow[]>([]);
  const [totals, setTotals] = useState({ impressions: 0, clicks: 0, spend: 0 });

  async function fetchInsights() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ad_account_id: selectedAccount,
          level,
          date_preset: datePreset,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.error ?? "请求失败");
        setRows([]);
        return;
      }

      // Parse data — Make returns array of objects with .data as JSON string
      const rawData: InsightRow[] = Array.isArray(json.data) ? json.data : [];
      const parsed = rawData.map(parseRow);
      setRows(parsed);

      const t = { impressions: 0, clicks: 0, spend: 0 };
      for (const r of parsed) {
        t.impressions += Number(r.impressions ?? 0);
        t.clicks += Number(r.clicks ?? 0);
        t.spend += Number(r.spend ?? 0);
      }
      setTotals(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "网络错误");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-zinc-500 mb-1">广告账号</label>
          <select value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)} className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm">
            {accounts.map((a) => (
              <option key={a.actId} value={a.actId}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">时间范围</label>
          <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm">
            {DATE_PRESETS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-500 mb-1">维度</label>
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm">
            <option value="account">账号</option>
            <option value="campaign">广告系列</option>
            <option value="adset">广告组</option>
            <option value="ad">广告</option>
          </select>
        </div>
        <button onClick={fetchInsights} disabled={loading} className="rounded bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {loading ? "加载中..." : "查询"}
        </button>
      </div>

      {error && <div className="rounded bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 text-sm">{error}</div>}

      {rows.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="text-xs text-zinc-500">总展示</div>
              <div className="text-2xl font-semibold mt-1">{totals.impressions.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="text-xs text-zinc-500">总点击</div>
              <div className="text-2xl font-semibold mt-1">{totals.clicks.toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="text-xs text-zinc-500">总花费</div>
              <div className="text-2xl font-semibold mt-1">${totals.spend.toFixed(2)}</div>
            </div>
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="text-xs text-zinc-500">平均 CTR</div>
              <div className="text-2xl font-semibold mt-1">{totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0"}%</div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase bg-zinc-50 dark:bg-zinc-800">
                <tr>
                  <th className="px-4 py-2">#</th>
                  <th className="px-4 py-2">展示</th>
                  <th className="px-4 py-2">点击</th>
                  <th className="px-4 py-2">花费</th>
                  <th className="px-4 py-2">CPM</th>
                  <th className="px-4 py-2">CTR</th>
                  <th className="px-4 py-2">日期</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                    <td className="px-4 py-2">{i + 1}</td>
                    <td className="px-4 py-2">{Number(r.impressions ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2">{Number(r.clicks ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-2">${Number(r.spend ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-2">{Number(r.cpm ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-2">{Number(r.ctr ?? 0).toFixed(2)}%</td>
                    <td className="px-4 py-2 text-xs text-zinc-500">{r.date_start ?? ""} ~ {r.date_stop ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
