import Link from "next/link";

type Props = {
  active: number | null;
  basePath: string;
  from?: string | null;
  to?: string | null;
  projectSlug?: string | null;
  // Additional query params to preserve across preset links + form submission
  // (e.g. meta_account=… on /reports/meta).
  keepParams?: Record<string, string | null | undefined>;
};

const PRESETS = [7, 14, 28, 60, 90];

export function DateRangeBar({ active, basePath, from, to, projectSlug, keepParams }: Props) {
  const hasCustom = !!(from && to);
  const params: Record<string, string> = {};
  if (projectSlug) params.project = projectSlug;
  if (keepParams) {
    for (const [k, v] of Object.entries(keepParams)) {
      if (v) params[k] = v;
    }
  }
  const extraQuery = Object.entries(params)
    .map(([k, v]) => `&${k}=${encodeURIComponent(v)}`)
    .join("");
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-zinc-500">时间范围：</span>
      {PRESETS.map((d) => {
        const isActive = !hasCustom && d === active;
        return (
          <Link
            key={d}
            href={`${basePath}?days=${d}${extraQuery}`}
            className={
              isActive
                ? "px-3 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "px-3 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }
          >
            最近 {d} 天
          </Link>
        );
      })}
      <form action={basePath} method="get" className="flex items-center gap-2 ml-2">
        {Object.entries(params).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <input
          type="date"
          name="from"
          defaultValue={from ?? ""}
          className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
          required
        />
        <span className="text-zinc-400">至</span>
        <input
          type="date"
          name="to"
          defaultValue={to ?? ""}
          className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs"
          required
        />
        <button
          type="submit"
          className={
            hasCustom
              ? "px-3 py-1 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-xs"
              : "px-3 py-1 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs"
          }
        >
          {hasCustom ? "已应用" : "自定义"}
        </button>
      </form>
    </div>
  );
}
