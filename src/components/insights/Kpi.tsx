type Props = {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
  size?: "sm" | "md";
};

const fmt = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });

export function Kpi({ label, value, delta, hint, size = "md" }: Props) {
  const valueClass = size === "sm" ? "text-xl" : "text-2xl";
  const showDelta = delta != null && Number.isFinite(delta);
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 min-w-0">
      <div className="text-xs text-zinc-500 truncate">{label}</div>
      <div className={`${valueClass} font-semibold mt-1 truncate`}>{value}</div>
      <div className="text-xs mt-1 flex items-center gap-1">
        {showDelta ? (
          <span className={positive ? "text-emerald-600" : "text-rose-600"}>
            {positive ? "↑" : "↓"} {fmt.format(Math.abs(delta!))}%
          </span>
        ) : (
          <span className="text-zinc-400">—</span>
        )}
        {hint && <span className="text-zinc-400 truncate">· {hint}</span>}
      </div>
    </div>
  );
}

export function fmtNumber(n: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat("en-US", opts).format(n);
}

export function fmtCompact(n: number): string {
  if (Math.abs(n) >= 10000) {
    return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function fmtMoney(n: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(n);
}

export function fmtPct(n: number, digits = 2): string {
  return `${(n * 100).toFixed(digits)}%`;
}
