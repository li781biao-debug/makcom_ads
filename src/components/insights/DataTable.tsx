import { ReactNode } from "react";

export type Col<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right";
  width?: string;
};

type Props<T> = {
  title?: string;
  rows: T[];
  cols: Col<T>[];
  emptyMessage?: string;
};

export function DataTable<T>({ title, rows, cols, emptyMessage = "无数据" }: Props<T>) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 font-medium">{title}</div>
      )}
      {rows.length === 0 ? (
        <div className="text-sm text-zinc-400 italic px-4 py-8 text-center">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-500">
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
              {rows.map((row, i) => (
                <tr key={i} className="border-t border-zinc-200 dark:border-zinc-800">
                  {cols.map((c) => (
                    <td
                      key={c.key}
                      className={`px-3 py-2 ${c.align === "right" ? "text-right tabular-nums" : ""}`}
                    >
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
