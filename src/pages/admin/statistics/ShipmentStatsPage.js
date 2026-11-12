import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Notice } from "@/components/ui/Panel";
import { fetchShipmentStatistics } from "@/lib/statisticsApi";
import { PeriodFilter, StatisticsBackLink } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
import { useStatisticsResource } from "@/pages/admin/statistics/useStatisticsResource";
export function ShipmentStatsPage() {
    const { startDate, endDate, invalid } = useStatisticsPeriod();
    const { data, loading, error } = useStatisticsResource(fetchShipmentStatistics, startDate, endDate, invalid);
    return (_jsxs("div", { children: [_jsx(StatisticsBackLink, {}), _jsx(PeriodFilter, {}), _jsx("p", { className: "mb-4 text-sm text-neutral-500", children: "\uC120\uD0DD\uD55C \uAE30\uAC04\uC5D0 \uC0DD\uC131\uB41C \uBC30\uC1A1\uC758 \uD604\uC7AC \uC0C1\uD0DC\uC785\uB2C8\uB2E4." }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "grid gap-3 md:grid-cols-3", children: [_jsx(Card, { label: "\uBC30\uC1A1 \uB300\uAE30", value: loading ? "조회 중" : count(data?.readyCount) }), _jsx(Card, { label: "\uBC30\uC1A1\uC911", value: loading ? "조회 중" : count(data?.shippingCount) }), _jsx(Card, { label: "\uBC30\uC1A1 \uC644\uB8CC", value: loading ? "조회 중" : count(data?.completedCount), hint: "\uBC30\uC1A1 \uC644\uB8CC\uC640 \uC218\uB839 \uC644\uB8CC" })] })] }));
}
function Card({ label, value, hint }) {
    return (_jsxs("div", { className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", children: [_jsx("p", { className: "text-sm text-neutral-500", children: label }), _jsx("p", { className: "mt-2 text-2xl font-semibold text-blue-600", children: value }), hint !== undefined && _jsx("p", { className: "mt-1 text-xs text-neutral-500", children: hint })] }));
}
function count(value) {
    return value === undefined ? "-" : `${value.toLocaleString("ko-KR")}건`;
}
