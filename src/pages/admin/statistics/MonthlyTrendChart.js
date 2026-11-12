import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const TONE_CLASS = {
    blue: "stroke-blue-600",
    green: "stroke-green-600",
};
export function MonthlyTrendChart({ title, labels, series, loading, formatValue }) {
    return (_jsxs("div", { className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-3", children: [_jsx("p", { className: "text-sm font-medium", children: title }), _jsx("ul", { className: "flex gap-3 text-xs text-neutral-500", children: series.map((item) => (_jsxs("li", { className: "flex items-center gap-1", children: [_jsx("span", { className: `inline-block size-2.5 ${item.tone === "blue" ? "bg-blue-600" : "bg-green-600"}` }), item.name] }, item.name))) })] }), loading ? (_jsx("p", { className: "py-16 text-center text-sm text-neutral-500", children: "\uCD94\uC774\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." })) : labels.length === 0 ? (_jsx("p", { className: "py-16 text-center text-sm text-neutral-500", children: "\uC870\uD68C \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (_jsx(TrendPlot, { labels: labels, series: series, formatValue: formatValue }))] }));
}
function TrendPlot({ labels, series, formatValue, }) {
    const values = series.flatMap((item) => item.values);
    const bounds = axisBounds(values);
    const ticks = axisTicks(bounds.min, bounds.max);
    const left = Math.max(36, ...ticks.map((tick) => formatValue(tick).length * 7));
    const width = 640;
    const height = 220;
    const plot = { left, top: 8, right: width - 8, bottom: height - 24 };
    const plotWidth = plot.right - plot.left;
    const plotHeight = plot.bottom - plot.top;
    function xAt(index) {
        if (labels.length === 1) {
            return plot.left + plotWidth / 2;
        }
        return plot.left + (index / (labels.length - 1)) * plotWidth;
    }
    function yAt(value) {
        return plot.bottom - ((value - bounds.min) / (bounds.max - bounds.min)) * plotHeight;
    }
    return (_jsxs("svg", { viewBox: `0 0 ${width} ${height}`, className: "h-56 w-full", role: "img", "aria-label": labels.join(", "), children: [ticks.map((tick) => (_jsxs("g", { children: [_jsx("line", { x1: plot.left, x2: plot.right, y1: yAt(tick), y2: yAt(tick), className: "stroke-neutral-200" }), _jsx("text", { x: plot.left - 6, y: yAt(tick) + 3, textAnchor: "end", className: "fill-neutral-500 text-[10px]", children: formatValue(tick) })] }, tick))), series.map((item) => item.values.length === 1 ? (_jsx("circle", { cx: xAt(0), cy: yAt(item.values[0] ?? 0), r: "3", className: item.tone === "blue" ? "fill-blue-600" : "fill-green-600", children: _jsx("title", { children: `${labels[0] ?? ""} ${item.name} ${formatValue(item.values[0] ?? 0)}` }) }, item.name)) : (_jsx("polyline", { fill: "none", strokeWidth: "2", strokeLinejoin: "round", strokeLinecap: "round", points: item.values.map((value, index) => `${xAt(index)},${yAt(value)}`).join(" "), className: TONE_CLASS[item.tone], children: _jsx("title", { children: item.values.map((value, index) => `${labels[index]} ${item.name} ${formatValue(value)}`).join(", ") }) }, item.name))), labels.map((label, index) => (_jsx("text", { x: xAt(index), y: height - 6, textAnchor: "middle", className: "fill-neutral-500 text-[10px]", children: label }, `${label}-${index}`)))] }));
}
function axisBounds(values) {
    const lowest = Math.min(0, ...values);
    const highest = Math.max(0, ...values);
    return {
        min: lowest < 0 ? -niceCeiling(-lowest) : 0,
        max: niceCeiling(highest),
    };
}
function axisTicks(min, max) {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, index) => min + ((max - min) * index) / steps);
}
function niceCeiling(value) {
    if (value <= 0) {
        return 1;
    }
    const padded = value * 1.1;
    const magnitude = 10 ** Math.floor(Math.log10(padded));
    const normalized = padded / magnitude;
    const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
    return nice * magnitude;
}
