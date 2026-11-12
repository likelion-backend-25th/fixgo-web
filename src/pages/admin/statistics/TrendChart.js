import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const TONE_CLASS = {
    blue: { swatch: "bg-blue-400", line: "text-blue-400" },
    green: { swatch: "bg-green-600", line: "text-green-600" },
};
export function TrendChart({ title, labels, series, loading, emptyText, formatTick }) {
    const hasPoints = labels.length > 0 && series.some((item) => item.values.length === labels.length);
    return (_jsxs("section", { className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", children: [_jsxs("div", { className: "mb-3 flex items-start justify-between gap-3", children: [_jsx("p", { className: "text-sm font-medium text-neutral-900", children: title }), _jsx("ul", { className: "flex flex-wrap justify-end gap-3", children: series.map((item) => (_jsxs("li", { className: "flex items-center gap-1.5 text-xs text-neutral-600", children: [_jsx("span", { className: `inline-block size-2.5 ${TONE_CLASS[item.tone].swatch}` }), item.name] }, item.name))) })] }), loading ? _jsx("p", { className: "text-sm text-neutral-500", children: "\uADF8\uB798\uD504\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." }) : null, !loading && !hasPoints ? _jsx("p", { className: "text-sm text-neutral-500", children: emptyText }) : null, !loading && hasPoints ? (_jsx(TrendSvg, { title: title, labels: labels, series: series, formatTick: formatTick })) : null] }));
}
function TrendSvg({ title, labels, series, formatTick, }) {
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
    return (_jsxs("svg", { viewBox: `0 0 ${width} ${height}`, className: "h-64 w-full", role: "img", "aria-label": title, children: [ticks.map((tick) => {
                const y = top + plotHeight - (tick / max) * plotHeight;
                return (_jsxs("g", { children: [_jsx("line", { x1: left, x2: width - right, y1: y, y2: y, className: "stroke-neutral-200" }), _jsx("text", { x: left - 8, y: y + 4, textAnchor: "end", className: "fill-neutral-500 text-[11px]", children: formatTick(tick) })] }, tick));
            }), series.map((item) => {
                const points = item.values.map((value, index) => ({
                    x: left + stepX * index,
                    y: top + plotHeight - (value / max) * plotHeight,
                }));
                return (_jsxs("g", { className: TONE_CLASS[item.tone].line, children: [points.length > 1 ? (_jsx("path", { d: smoothPath(points), fill: "none", stroke: "currentColor", strokeWidth: "2" })) : null, points.map((point) => (_jsx("circle", { cx: point.x, cy: point.y, r: "3", fill: "currentColor" }, `${item.name}-${point.x}`)))] }, item.name));
            }), labels.map((label, index) => (_jsx("text", { x: left + stepX * index, y: height - 8, textAnchor: "middle", className: "fill-neutral-500 text-[11px]", children: label }, `${label}-${index}`)))] }));
}
function niceMax(peak) {
    if (peak <= 0) {
        return 4;
    }
    const rough = peak * 1.05;
    const power = 10 ** Math.floor(Math.log10(rough));
    const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((value) => value * 4 >= rough);
    return (step ?? power * 10) * 4;
}
function smoothPath(points) {
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
