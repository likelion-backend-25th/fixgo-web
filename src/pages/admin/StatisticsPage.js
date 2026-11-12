import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router";
import { Notice } from "@/components/ui/Panel";
import { fetchLongPendingReceptions } from "@/lib/longPendingApi";
import { fetchModelStatistics, fetchMonthlyStatistics, fetchPaymentStatistics, fetchReceptionStatistics, fetchShipmentStatistics, fetchTechnicianStatistics, } from "@/lib/statisticsApi";
import { formatDurationMinutes, formatRate, statisticsSearch } from "@/lib/statisticsPeriod";
import { won } from "@/lib/format";
import { MonthlyTrendChart } from "@/pages/admin/statistics/MonthlyTrendChart";
import { PeriodFilter } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
import { useStatisticsResource } from "@/pages/admin/statistics/useStatisticsResource";
export function StatisticsPage() {
    const { startDate, endDate, invalid } = useStatisticsPeriod();
    const reception = useStatisticsResource(fetchReceptionStatistics, startDate, endDate, invalid);
    const payment = useStatisticsResource(fetchPaymentStatistics, startDate, endDate, invalid);
    const technicians = useStatisticsResource(fetchTechnicianStatistics, startDate, endDate, invalid);
    const models = useStatisticsResource(fetchModelStatistics, startDate, endDate, invalid);
    const shipments = useStatisticsResource(fetchShipmentStatistics, startDate, endDate, invalid);
    const pending = useStatisticsResource(loadLongPending, startDate, endDate, invalid);
    const monthly = useStatisticsResource(fetchMonthlyStatistics, startDate, endDate, invalid);
    const query = statisticsSearch(startDate, endDate);
    const monthLabels = monthly.data?.map((point) => point.label) ?? [];
    const errors = [reception.error, payment.error, technicians.error, models.error, shipments.error, pending.error, monthly.error]
        .filter((message, index, all) => message !== "" && all.indexOf(message) === index);
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(PeriodFilter, {}), errors.map((message) => _jsx(Notice, { tone: "error", children: message }, message)), _jsxs("div", { className: "grid gap-3 md:grid-cols-5", children: [_jsx(Kpi, { label: "\uC811\uC218", value: countText(reception.loading, reception.data?.receivedCount, "건"), hint: `${startDate} ~ ${endDate}` }), _jsx(Kpi, { label: "\uCC98\uB9AC \uC644\uB8CC", value: countText(reception.loading, reception.data?.completedCount, "건"), hint: reception.data === null ? "완료율" : `완료율 ${formatRate(reception.data.completionRate)}` }), _jsxs(Link, { to: "/admin/statistics/incomplete", className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-400", children: [_jsx("p", { className: "text-sm text-neutral-500", children: "\uC7A5\uAE30 \uBBF8\uCC98\uB9AC" }), _jsx("p", { className: "mt-2 text-2xl font-semibold text-blue-600", children: countText(pending.loading, pending.data?.total, "건") }), _jsxs("p", { className: "mt-1 text-xs text-neutral-500", children: ["21\uC77C \uC774\uC0C1 ", countText(pending.loading, pending.data?.over21, "건")] })] }), _jsx(Kpi, { label: "\uD3C9\uADE0 \uC218\uB9AC \uAE30\uAC04", value: technicians.loading ? "조회 중" : formatDurationMinutes(weightedAverageMinutes(technicians.data ?? [])), hint: "\uC644\uB8CC \uAC74 \uAC00\uC911 \uD3C9\uADE0" }), _jsxs(Link, { to: `/admin/statistics/deposits/waiting?${query}`, className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-400", children: [_jsx("p", { className: "text-sm text-neutral-500", children: "\uBBF8\uC785\uAE08" }), _jsx("p", { className: "mt-2 text-2xl font-semibold text-blue-600", children: countText(payment.loading, payment.data?.unpaidCount, "건") }), _jsx("p", { className: "mt-1 text-xs text-neutral-500", children: "\uD604\uC7AC \uBBF8\uC785\uAE08 \uCCAD\uAD6C\uC11C" })] })] }), _jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [_jsx(MonthlyTrendChart, { title: "\uC6D4\uBCC4 \uC218\uB9AC \uAC74\uC218 \uCD94\uC774", labels: monthLabels, loading: monthly.loading, formatValue: formatCount, series: [
                            { name: "접수", tone: "blue", values: monthly.data?.map((point) => point.receivedCount) ?? [] },
                            { name: "완료", tone: "green", values: monthly.data?.map((point) => point.completedCount) ?? [] },
                        ] }), _jsx(MonthlyTrendChart, { title: "\uC6D4\uBCC4 \uC218\uC775", labels: monthLabels, loading: monthly.loading, formatValue: formatCount, series: [
                            { name: "수익", tone: "blue", values: monthly.data?.map((point) => point.revenue) ?? [] },
                        ] })] }), _jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [_jsxs(Link, { to: `/admin/statistics/shipments?${query}`, className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-400", children: [_jsx("p", { className: "mb-3 text-sm font-medium", children: "\uBC30\uC1A1 \uD604\uD669" }), _jsxs("div", { className: "grid grid-cols-3 gap-3 text-sm", children: [_jsx(Metric, { label: "\uB300\uAE30", value: countText(shipments.loading, shipments.data?.readyCount, "건") }), _jsx(Metric, { label: "\uBC30\uC1A1\uC911", value: countText(shipments.loading, shipments.data?.shippingCount, "건") }), _jsx(Metric, { label: "\uC644\uB8CC", value: countText(shipments.loading, shipments.data?.completedCount, "건") })] })] }), _jsxs(Link, { to: `/admin/statistics/repair_cost?${query}`, className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-400", children: [_jsx("p", { className: "mb-3 text-sm font-medium", children: "\uC218\uB9AC\uBE44 \uC218\uB0A9" }), _jsxs("div", { className: "grid grid-cols-3 gap-3 text-sm", children: [_jsx(Metric, { label: "\uC218\uB0A9", value: moneyText(payment.loading, payment.data?.totalPaidAmount) }), _jsx(Metric, { label: "\uD658\uBD88", value: moneyText(payment.loading, payment.data?.totalRefundAmount) }), _jsx(Metric, { label: "\uC21C\uC218\uB0A9", value: moneyText(payment.loading, payment.data?.netCollectedAmount) })] })] })] }), _jsxs("div", { className: "grid gap-4 lg:grid-cols-2", children: [_jsxs(Link, { to: `/admin/statistics/technicians?${query}`, className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-400", children: [_jsx("p", { className: "mb-3 text-sm font-medium", children: "\uAE30\uC0AC\uBCC4 \uCC98\uB9AC \uD604\uD669" }), _jsx(TechnicianBars, { loading: technicians.loading, rows: technicians.data ?? [] })] }), _jsxs(Link, { to: `/admin/statistics/models?${query}`, className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-400", children: [_jsx("p", { className: "mb-3 text-sm font-medium", children: "\uC81C\uD488 \uBAA8\uB378\uBCC4 \uACE0\uC7A5 \uAC74\uC218" }), _jsx(ModelPreview, { loading: models.loading, rows: models.data ?? [] })] })] }), _jsx(Kpi, { label: "\uCD1D \uC785\uAE08\uC561", value: moneyText(payment.loading, payment.data?.totalPaidAmount), hint: "\uAE30\uAC04 \uB0B4 \uC2B9\uC778 \uC644\uB8CC \uAE08\uC561" })] }));
}
// 장기 미처리는 기간 파라미터가 없어서, 화면 기간이 바뀌어도 같은 목록의 건수만 다시 센다.
function loadLongPending(_startDate, _endDate, signal) {
    return fetchLongPendingReceptions(signal).then((items) => ({
        total: items.length,
        over21: items.filter((item) => item.elapsedDays >= 21).length,
    }));
}
function weightedAverageMinutes(rows) {
    const totals = rows.reduce((sum, row) => {
        if (row.averageDurationMinutes === null || row.completedCount === 0) {
            return sum;
        }
        return {
            minutes: sum.minutes + row.averageDurationMinutes * row.completedCount,
            count: sum.count + row.completedCount,
        };
    }, { minutes: 0, count: 0 });
    return totals.count === 0 ? null : totals.minutes / totals.count;
}
function formatCount(value) {
    return Math.round(value).toLocaleString("ko-KR");
}
function countText(loading, value, unit) {
    if (loading) {
        return "조회 중";
    }
    return value === undefined ? "-" : `${value.toLocaleString("ko-KR")}${unit}`;
}
function moneyText(loading, value) {
    if (loading) {
        return "조회 중";
    }
    return value === undefined ? "-" : won(value);
}
function Kpi({ label, value, hint }) {
    return (_jsxs("div", { className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", children: [_jsx("p", { className: "text-sm text-neutral-500", children: label }), _jsx("p", { className: "mt-2 text-2xl font-semibold text-blue-600", children: value }), _jsx("p", { className: "mt-1 text-xs text-neutral-500", children: hint })] }));
}
function Metric({ label, value }) {
    return (_jsxs("div", { children: [_jsx("p", { className: "text-neutral-500", children: label }), _jsx("p", { className: "mt-1 font-semibold text-blue-600", children: value })] }));
}
function TechnicianBars({ loading, rows }) {
    const top = [...rows].sort((left, right) => right.assignedCount - left.assignedCount).slice(0, 5);
    const max = Math.max(...top.map((row) => row.assignedCount), 1);
    if (loading) {
        return _jsx("p", { className: "text-sm text-neutral-500", children: "\uAE30\uC0AC \uD1B5\uACC4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." });
    }
    if (top.length === 0) {
        return _jsx("p", { className: "text-sm text-neutral-500", children: "\uC870\uD68C \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." });
    }
    return (_jsx("ul", { className: "space-y-3", children: top.map((row) => (_jsxs("li", { children: [_jsxs("div", { className: "mb-1 flex justify-between text-sm", children: [_jsx("span", { children: row.technicianName }), _jsxs("span", { children: [row.assignedCount.toLocaleString("ko-KR"), "\uAC74"] })] }), _jsx("div", { className: "h-2 rounded bg-neutral-100", children: _jsx("div", { className: "h-2 rounded bg-blue-600", style: { width: `${(row.assignedCount / max) * 100}%` } }) })] }, row.technicianId))) }));
}
function ModelPreview({ loading, rows }) {
    const top = [...rows].sort((left, right) => right.receptionCount - left.receptionCount).slice(0, 5);
    if (loading) {
        return _jsx("p", { className: "text-sm text-neutral-500", children: "\uBAA8\uB378 \uD1B5\uACC4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." });
    }
    if (top.length === 0) {
        return _jsx("p", { className: "text-sm text-neutral-500", children: "\uC870\uD68C \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." });
    }
    return (_jsxs("table", { className: "w-full text-left text-sm", children: [_jsx("thead", { className: "bg-neutral-100", children: _jsx("tr", { children: ["모델", "접수", "완료", "주요 증상"].map((header) => (_jsx("th", { className: "px-2 py-1 font-medium", children: header }, header))) }) }), _jsx("tbody", { children: top.map((row) => (_jsxs("tr", { className: "border-t border-neutral-200", children: [_jsx("td", { className: "px-2 py-2", children: row.modelName }), _jsx("td", { children: row.receptionCount.toLocaleString("ko-KR") }), _jsx("td", { children: row.completedCount.toLocaleString("ko-KR") }), _jsx("td", { children: row.mainSymptom ?? "-" })] }, row.modelId))) })] }));
}
