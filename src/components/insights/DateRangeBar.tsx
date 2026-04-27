import Link from "next/link";

type Props = {
  active: number;
  basePath: string;
};

const PRESETS = [7, 14, 28, 60, 90];

export function DateRangeBar({ active, basePath }: Props) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-zinc-500">时间范围：</span>
      {PRESETS.map((d) => {
        const isActive = d === active;
        return (
          <Link
            key={d}
            href={`${basePath}?days=${d}`}
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
    </div>
  );
}
