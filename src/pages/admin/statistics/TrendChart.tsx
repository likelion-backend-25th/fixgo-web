interface TrendSeries {
  name: string;
  tone: "blue" | "green";
  values: number[];
}

interface TrendChartProps {
  title: string;
  labels: string[];
  series: TrendSeries[];
  loading: boolean;
  emptyText: string;
  formatTick: (value: number) => string;
}

const TONE_CLASS = {
  blue: { swatch: "bg-blue-600", line: "text-blue-600" },
  green: { swatch: "bg-green-600", line: "text-green-600" },
} as const;

export function TrendChart({ title, labels, series, loading, emptyText, formatTick }: TrendChartProps) {
  const hasPoints = labels.length > 0 && series.some((item) => item.values.length === labels.length);
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        <ul className="flex flex-wrap justify-end gap-3">
          {series.map((item) => (
            <li key={item.name} className="flex items-center gap-1.5 text-xs text-neutral-600">
              <span className={`inline-block size-2.5 ${TONE_CLASS[item.tone].swatch}`} />
              {item.name}
            </li>
          ))}
        </ul>
      </div>
      {loading ? <p className="text-sm text-neutral-500">그래프를 불러오는 중입니다.</p> : null}
      {!loading && !hasPoints ? <p className="text-sm text-neutral-500">{emptyText}</p> : null}
      {!loading && hasPoints ? (
        <TrendSvg title={title} labels={labels} series={series} formatTick={formatTick} />
      ) : null}
    </section>
  );
}

function TrendSvg({
  title,
  labels,
  series,
  formatTick,
}: {
  title: string;
  labels: string[];
  series: TrendSeries[];
  formatTick: (value: number) => string;
}) {
  const width = 640;
  const height = 260;
  const left = 52;
  const right = 16;
  const top = 12;
  const bottom = 32;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const peak = Math.max(0, ...series.flatMap((item) => item.values));
  const max = niceMax(peak);
  const ticks = [0, 1, 2, 3, 4].map((step) => (max / 4) * step);
  const stepX = labels.length === 1 ? 0 : plotWidth / (labels.length - 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-64 w-full" role="img" aria-label={title}>
      {ticks.map((tick) => {
        const y = top + plotHeight - (tick / max) * plotHeight;
        return (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={y} y2={y} className="stroke-neutral-200" />
            <text x={left - 8} y={y + 4} textAnchor="end" className="fill-neutral-500 text-[11px]">
              {formatTick(tick)}
            </text>
          </g>
        );
      })}
      {series.map((item) => {
        const points = item.values.map((value, index) => ({
          x: left + stepX * index,
          y: top + plotHeight - (value / max) * plotHeight,
        }));
        return (
          <g key={item.name} className={TONE_CLASS[item.tone].line}>
            {points.length > 1 ? (
              <path d={smoothPath(points)} fill="none" stroke="currentColor" strokeWidth="2" />
            ) : null}
            {points.map((point) => (
              <circle key={`${item.name}-${point.x}`} cx={point.x} cy={point.y} r="3" fill="currentColor" />
            ))}
          </g>
        );
      })}
      {labels.map((label, index) => (
        <text
          key={`${label}-${index}`}
          x={left + stepX * index}
          y={height - 8}
          textAnchor="middle"
          className="fill-neutral-500 text-[11px]"
        >
          {label}
        </text>
      ))}
    </svg>
  );
}

function niceMax(peak: number): number {
  if (peak <= 0) {
    return 4;
  }
  const rough = peak * 1.05;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((value) => value * 4 >= rough);
  return (step ?? power * 10) * 4;
}

function smoothPath(points: { x: number; y: number }[]): string {
  const first = points[0];
  if (first === undefined) {
    return "";
  }
  let path = `M ${first.x} ${first.y}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] ?? points[index];
    const current = points[index];
    const next = points[index + 1];
    const after = points[index + 2] ?? next;
    if (current === undefined || next === undefined || previous === undefined || after === undefined) {
      continue;
    }
    const controlStartX = current.x + (next.x - previous.x) / 6;
    const controlStartY = current.y + (next.y - previous.y) / 6;
    const controlEndX = next.x - (after.x - current.x) / 6;
    const controlEndY = next.y - (after.y - current.y) / 6;
    path += ` C ${controlStartX} ${controlStartY}, ${controlEndX} ${controlEndY}, ${next.x} ${next.y}`;
  }
  return path;
}
