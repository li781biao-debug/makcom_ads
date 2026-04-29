type Props = {
  shopify?: Date | null;
  meta?: Date | null;
  google?: Date | null;
};

export function Freshness({ shopify, meta, google }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
      <span>数据最新更新：</span>
      {shopify !== undefined && <Item label="Shopify" t={shopify} />}
      {meta !== undefined && <Item label="Meta" t={meta} />}
      {google !== undefined && <Item label="Google" t={google} />}
    </div>
  );
}

function Item({ label, t }: { label: string; t: Date | null | undefined }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
      <span className="text-zinc-400">{label}:</span>
      <span className="tabular-nums">{t ? formatRelative(t) : "—"}</span>
    </span>
  );
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s} 秒前`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const days = Math.floor(h / 24);
  if (days < 30) return `${days} 天前`;
  return d.toISOString().slice(0, 10);
}
