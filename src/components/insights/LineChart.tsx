type Series = { name: string; color: string; values: number[] };
type Props = {
  labels: string[];
  series: Series[];
  height?: number;
};

export function LineChart({ labels, series, height = 240 }: Props) {
  if (labels.length === 0 || series.every((s) => s.values.length === 0)) {
    return (
      <div className="text-sm text-zinc-400 italic py-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
        无数据
      </div>
    );
  }

  const width = 800;
  const padX = 40;
  const padY = 20;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const allValues = series.flatMap((s) => s.values);
  const max = Math.max(1, ...allValues);
  const min = 0;

  const xAt = (i: number) => padX + (i / Math.max(labels.length - 1, 1)) * innerW;
  const yAt = (v: number) =>
    padY + innerH - ((v - min) / (max - min || 1)) * innerH;

  const xTicks = [0, Math.floor((labels.length - 1) / 3), Math.floor(((labels.length - 1) * 2) / 3), labels.length - 1]
    .filter((v, i, a) => a.indexOf(v) === i && v >= 0);
  const yTicks = 5;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="flex gap-4 mb-2 text-xs">
        {series.map((s) => (
          <div key={s.name} className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 rounded" style={{ background: s.color }} />
            <span className="text-zinc-700 dark:text-zinc-300">{s.name}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
        {Array.from({ length: yTicks + 1 }).map((_, i) => {
          const v = min + ((max - min) * i) / yTicks;
          const y = yAt(v);
          return (
            <g key={i}>
              <line x1={padX} x2={width - padX} y1={y} y2={y} stroke="#e5e7eb" strokeWidth={1} />
              <text x={padX - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
                {fmtAxis(v)}
              </text>
            </g>
          );
        })}
        {xTicks.map((i) => (
          <text key={i} x={xAt(i)} y={height - 4} textAnchor="middle" fontSize={10} fill="#9ca3af">
            {labels[i]?.slice(5) ?? ""}
          </text>
        ))}
        {series.map((s) => {
          const points = s.values
            .map((v, i) => `${xAt(i)},${yAt(v)}`)
            .join(" ");
          return (
            <polyline
              key={s.name}
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>
    </div>
  );
}

function fmtAxis(n: number): string {
  if (Math.abs(n) >= 10000)
    return new Intl.NumberFormat("zh-CN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}
