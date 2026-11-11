interface TrendSeries {
  name: string;
  tone: "blue" | "green";
  values: number[];
}

interface MonthlyTrendChartProps {
  title: string;
  labels: string[];
  series: TrendSeries[];
  loading: boolean;
  formatValue: (value: number) => string;
}

const TONE_CLASS = {
  blue: "stroke-blue-600",
  green: "stroke-green-600",
} as const;

export function MonthlyTrendChart({ title, labels, series, loading, formatValue }: MonthlyTrendChartProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <ul className="flex gap-3 text-xs text-neutral-500">
          {series.map((item) => (
            <li key={item.name} className="flex items-center gap-1">
              <span className={`inline-block size-2.5 ${item.tone === "blue" ? "bg-blue-600" : "bg-green-600"}`} />
              {item.name}
            </li>
          ))}
        </ul>
      </div>
      {loading ? (
        <p className="py-16 text-center text-sm text-neutral-500">추이를 불러오는 중입니다.</p>
      ) : labels.length === 0 ? (
        <p className="py-16 text-center text-sm text-neutral-500">조회 결과가 없습니다.</p>
      ) : (
        <TrendPlot labels={labels} series={series} formatValue={formatValue} />
      )}
    </div>
  );
}

function TrendPlot({
  labels,
  series,
  formatValue,
}: {
  labels: string[];
  series: TrendSeries[];
  formatValue: (value: number) => string;
}) {
  const values = series.flatMap((item) => item.values);
  const bounds = axisBounds(values);
  const ticks = axisTicks(bounds.min, bounds.max);
  const left = Math.max(36, ...ticks.map((tick) => formatValue(tick).length * 7));
  const width = 640;
  const height = 220;
  const plot = { left, top: 8, right: width - 8, bottom: height - 24 };
  const plotWidth = plot.right - plot.left;
  const plotHeight = plot.bottom - plot.top;

  function xAt(index: number): number {
    if (labels.length === 1) {
      return plot.left + plotWidth / 2;
    }
    return plot.left + (index / (labels.length - 1)) * plotWidth;
  }

  function yAt(value: number): number {
    return plot.bottom - ((value - bounds.min) / (bounds.max - bounds.min)) * plotHeight;
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label={labels.join(", ")}>
      {ticks.map((tick) => (
        <g key={tick}>
          <line x1={plot.left} x2={plot.right} y1={yAt(tick)} y2={yAt(tick)} className="stroke-neutral-200" />
          <text x={plot.left - 6} y={yAt(tick) + 3} textAnchor="end" className="fill-neutral-500 text-[10px]">
            {formatValue(tick)}
          </text>
        </g>
      ))}
      {series.map((item) => item.values.length === 1 ? (
        <circle key={item.name} cx={xAt(0)} cy={yAt(item.values[0] ?? 0)} r="3" className={item.tone === "blue" ? "fill-blue-600" : "fill-green-600"}>
          <title>{`${labels[0] ?? ""} ${item.name} ${formatValue(item.values[0] ?? 0)}`}</title>
        </circle>
      ) : (
        <polyline
          key={item.name}
          fill="none"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={item.values.map((value, index) => `${xAt(index)},${yAt(value)}`).join(" ")}
          className={TONE_CLASS[item.tone]}
        >
          <title>
            {item.values.map((value, index) => `${labels[index]} ${item.name} ${formatValue(value)}`).join(", ")}
          </title>
        </polyline>
      ))}
      {labels.map((label, index) => (
        <text key={`${label}-${index}`} x={xAt(index)} y={height - 6} textAnchor="middle" className="fill-neutral-500 text-[10px]">
          {label}
        </text>
      ))}
    </svg>
  );
}

function axisBounds(values: number[]): { min: number; max: number } {
  const lowest = Math.min(0, ...values);
  const highest = Math.max(0, ...values);
  return {
    min: lowest < 0 ? -niceCeiling(-lowest) : 0,
    max: niceCeiling(highest),
  };
}

function axisTicks(min: number, max: number): number[] {
  const steps = 4;
  return Array.from({ length: steps + 1 }, (_, index) => min + ((max - min) * index) / steps);
}

function niceCeiling(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const padded = value * 1.1;
  const magnitude = 10 ** Math.floor(Math.log10(padded));
  const normalized = padded / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}
