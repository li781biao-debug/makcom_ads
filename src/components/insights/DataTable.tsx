import { ReactNode } from "react";

export type Col<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  // Optional %Δ vs the previous-period equivalent row. Returns null when
  // there's no prior data for this row (treated as "—").
  delta?: (curr: T, prev?: T) => number | null;
  align?: "left" | "right";
  width?: string;
};

type Props<T> = {
  title?: string;
  rows: T[];
  cols: Col<T>[];
  emptyMessage?: string;
  // For per-row delta lookup: pass previous-period rows + an identity fn.
  // DataTable maps prev by identity, then calls col.delta(curr, prev).
  prevRows?: T[];
  identity?: (r: T) => string;
  // Optional 总计 row at the bottom (bold). Delta column for the totals row
  // is computed via the same col.delta against prevTotalsRow.
  totalsRow?: T;
  prevTotalsRow?: T;
  // Constrains the body height; rows scroll inside. Header + totals stay put.
  maxHeight?: number;
};

function DeltaCell({ value }: { value: number | null }) {
  if (value == null) {
    return <span className="ml-1 text-xs text-zinc-400">—</span>;
  }
  if (value === 0) {
    return <span className="ml-1 text-xs text-zinc-500">0.0%</span>;
  }
  const positive = value > 0;
  return (
    <span className={`ml-1 text-xs ${positive ? "text-green-600" : "text-red-500"}`}>
      {positive ? "↑" : "↓"} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export function DataTable<T>({
  title,
  rows,
  cols,
  emptyMessage = "无数据",
  prevRows,
  identity,
  totalsRow,
  prevTotalsRow,
  maxHeight,
}: Props<T>) {
  const prevByKey = (() => {
    if (!prevRows || !identity) return null;
    const m = new Map<string, T>();
    for (const r of prevRows) m.set(identity(r), r);
    return m;
  })();
  const lookupPrev = (r: T): T | undefined => {
    if (!prevByKey || !identity) return undefined;
    return prevByKey.get(identity(r));
  };

  const cellClass = (c: Col<T>) =>
    `px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 font-medium">{title}</div>
      )}
      {rows.length === 0 ? (
        <div className="text-sm text-zinc-400 italic px-4 py-8 text-center">{emptyMessage}</div>
      ) : (
        <div
          className="overflow-auto"
          style={maxHeight ? { maxHeight: `${maxHeight}px` } : undefined}
        >
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-500 sticky top-0">
              <tr>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    className={`px-3 py-2 font-medium ${c.align === "right" ? "text-right" : "text-left"}`}
                    style={c.width ? { width: c.width } : undefined}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const prev = lookupPrev(row);
                return (
                  <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                    {cols.map((c) => (
                      <td key={c.key} className={cellClass(c)}>
                        {c.render(row)}
                        {c.delta && <DeltaCell value={c.delta(row, prev)} />}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
            {totalsRow && (
              <tfoot className="bg-zinc-50 dark:bg-zinc-800/50 sticky bottom-0">
                <tr className="border-t-2 border-zinc-300 dark:border-zinc-700 font-semibold">
                  {cols.map((c) => (
                    <td key={c.key} className={cellClass(c)}>
                      {c.render(totalsRow)}
                      {c.delta && <DeltaCell value={c.delta(totalsRow, prevTotalsRow)} />}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
