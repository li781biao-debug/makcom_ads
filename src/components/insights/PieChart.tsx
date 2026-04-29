type Slice = { label: string; value: number; color: string };
type Props = {
  slices: Slice[];
  size?: number;
};

const PALETTE = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899",
  "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

export function autoColors(n: number): string[] {
  return Array.from({ length: n }, (_, i) => PALETTE[i % PALETTE.length]);
}

export function PieChart({ slices, size = 200 }: Props) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-zinc-400 italic border border-dashed border-zinc-200 dark:border-zinc-800 rounded"
        style={{ width: size, height: size }}
      >
        无数据
      </div>
    );
  }

  const r = size / 2 - 1;
  const cx = size / 2;
  const cy = size / 2;
  let acc = 0;
  const arcs = slices.map((s) => {
    const start = acc;
    acc += s.value;
    const end = acc;
    const a0 = (start / total) * Math.PI * 2 - Math.PI / 2;
    const a1 = (end / total) * Math.PI * 2 - Math.PI / 2;
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy + r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const large = end - start > total / 2 ? 1 : 0;
    const mid = (a0 + a1) / 2;
    const lx = cx + r * 0.6 * Math.cos(mid);
    const ly = cy + r * 0.6 * Math.sin(mid);
    return {
      d: `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`,
      pct: (s.value / total) * 100,
      lx,
      ly,
      ...s,
    };
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs.map((a, i) => (
          <g key={i}>
            <path d={a.d} fill={a.color} />
            {a.pct >= 5 && (
              <text x={a.lx} y={a.ly} textAnchor="middle" fontSize={11} fill="white" fontWeight={500}>
                {a.pct.toFixed(1)}%
              </text>
            )}
          </g>
        ))}
      </svg>
      <ul className="text-xs space-y-1">
        {arcs.map((a, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: a.color }} />
            <span className="text-zinc-700 dark:text-zinc-300">{a.label}</span>
            <span className="text-zinc-400 ml-auto tabular-nums">{a.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
