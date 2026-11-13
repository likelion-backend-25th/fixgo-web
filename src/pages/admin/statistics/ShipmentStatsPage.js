import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useListParams } from "@/hooks/useListParams";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { SortMenu } from "@/components/ui/SortMenu";
import { formatDate, includesText } from "@/lib/format";
import { compareText } from "@/lib/guards";
import { shipmentMethodLabel, shipmentStatusClass } from "@/lib/shipmentApi";
import { fetchShipmentHistory } from "@/lib/statisticsApi";
import { PeriodFilter, StatisticsBackLink } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPage } from "@/pages/admin/statistics/useStatisticsPage";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
import { useStatisticsResource } from "@/pages/admin/statistics/useStatisticsResource";
const methodFilters = [
    { value: "ALL", label: "수령 방법 전체" },
    { value: "DELIVERY", label: "택배" },
    { value: "PICKUP", label: "방문 수령" },
];
const shipmentFilters = [
    { value: "ALL", label: "상태 전체" },
    { value: "배송 등록 대기", label: "배송 등록 대기" },
    { value: "배송 준비 완료", label: "배송 준비 완료" },
    { value: "배송 중", label: "배송 중" },
    { value: "배송 완료", label: "배송 완료" },
    { value: "방문 수령 대기", label: "방문 수령 대기" },
    { value: "방문 수령 완료", label: "방문 수령 완료" },
];
export function ShipmentStatsPage() {
    const { startDate, endDate, invalid } = useStatisticsPeriod();
    const history = useStatisticsResource(fetchShipmentHistory, startDate, endDate, invalid);
    const summary = history.data === null ? null : summarizeShipmentMethods(history.data);
    return (_jsxs("div", { children: [_jsx(StatisticsBackLink, {}), _jsx(PeriodFilter, {}), history.error !== "" && _jsx(Notice, { tone: "error", children: history.error }), _jsxs("div", { className: "grid gap-3 lg:grid-cols-2", children: [_jsx(MethodPanel, { title: "\uD0DD\uBC30", loading: history.loading, metrics: [
                        ["대기", summary?.delivery.ready],
                        ["배송중", summary?.delivery.shipping],
                        ["완료", summary?.delivery.completed],
                    ] }), _jsx(MethodPanel, { title: "\uBC29\uBB38 \uC218\uB839", loading: history.loading, metrics: [
                        ["대기", summary?.pickup.ready],
                        ["완료", summary?.pickup.completed],
                    ] })] }), _jsx(ShipmentHistorySection, { history: history })] }));
}
function ShipmentHistorySection({ history }) {
    const navigate = useNavigate();
    const filters = useListParams();
    const { startDate, endDate } = useStatisticsPeriod();
    const status = readShipmentFilter(filters.text("status", "ALL"));
    const method = readMethodFilter(filters.text("method", "ALL"));
    const appliedKeyword = filters.text("q");
    const [keyword, setKeyword] = useState(appliedKeyword);
    const sortRaw = filters.text("sort");
    const sortKey = sortRaw === "number" || sortRaw === "customer" || sortRaw === "method" || sortRaw === "status" || sortRaw === "date" ? sortRaw : null;
    const sortDir = filters.text("dir") === "desc" ? "desc" : "asc";
    const rows = useMemo(() => sortShipments(filterShipments(history.data ?? [], status, method, appliedKeyword), sortKey, sortDir), [appliedKeyword, history.data, method, sortDir, sortKey, status]);
    const list = useStatisticsPage(rows, `${startDate}|${endDate}|${status}|${method}|${appliedKeyword}|${sortKey ?? ""}|${sortDir}`);
    function toggleSort(key) {
        const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
        filters.replace({ sort: key, dir: nextDir, page: null });
    }
    return (_jsxs("section", { className: "mt-4", children: [_jsxs("div", { className: "mb-3 flex flex-wrap items-center justify-between gap-2", children: [_jsx("h2", { className: "section-title", children: "\uBC30\uC1A1 \uBAA9\uB85D" }), _jsxs("form", { className: "flex flex-wrap items-center gap-2", onSubmit: (event) => {
                        event.preventDefault();
                        filters.replace({ q: keyword.trim(), page: null });
                    }, children: [_jsx(TextField, { value: keyword, onChange: setKeyword, placeholder: "\uC811\uC218\uBC88\uD638, \uACE0\uAC1D\uBA85", className: "w-48" }), _jsx(Button, { type: "submit", children: "\uAC80\uC0C9" }), _jsx(SelectBox, { value: method, onChange: (value) => {
                        const next = readMethodFilter(value);
                        filters.replace({ method: next === "ALL" ? null : next, page: null });
                    }, options: methodFilters }), _jsx(SelectBox, { value: status, onChange: (value) => {
                        const next = readShipmentFilter(value);
                        filters.replace({ status: next === "ALL" ? null : next, page: null });
                    }, options: shipmentFilters })] })] }), _jsx(DataTable, { columns: shipmentColumns(sortKey, sortDir, toggleSort), rows: list.visible, rowKey: (row) => String(row.shipmentId), onRowClick: (row) => navigate(`/as/details/${row.receptionId}`), emptyText: shipmentEmptyText(history.loading, history.error) }), _jsx(Pagination, { page: list.page, pageCount: list.pageCount, onPageChange: list.setPage })] }));
}
function shipmentColumns(sortKey, sortDir, toggleSort) {
    return [
        shipmentColumn("number", "접수번호", sortKey, sortDir, toggleSort, (row) => row.receptionNumber),
        shipmentColumn("customer", "고객", sortKey, sortDir, toggleSort, (row) => row.customerName),
        shipmentColumn("method", "방식", sortKey, sortDir, toggleSort, (row) => shipmentMethodLabel(row.returnMethod)),
        shipmentColumn("status", "상태", sortKey, sortDir, toggleSort, (row) => {
            const status = historyListStatus(row);
            return status === null ? "-" : _jsx("span", { className: shipmentStatusClass(status), children: status });
        }),
        shipmentColumn("date", "등록일", sortKey, sortDir, toggleSort, (row) => formatDate(row.createdAt)),
    ];
}
function shipmentColumn(key, label, sortKey, sortDir, toggleSort, render) {
    return {
        key,
        header: _jsx(SortMenu, { label: label, active: sortKey === key, direction: sortDir, onToggle: () => toggleSort(key) }),
        render,
    };
}
function sortShipments(rows, sortKey, sortDir) {
    if (sortKey === null) {
        return rows;
    }
    const direction = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((left, right) => compareShipment(left, right, sortKey, direction));
}
function compareShipment(left, right, sortKey, direction) {
    if (sortKey === "number") {
        return compareText(left.receptionNumber, right.receptionNumber) * direction;
    }
    if (sortKey === "customer") {
        return compareText(left.customerName, right.customerName) * direction;
    }
    if (sortKey === "method") {
        return compareText(shipmentMethodLabel(left.returnMethod), shipmentMethodLabel(right.returnMethod)) * direction;
    }
    if (sortKey === "status") {
        return compareText(historyListStatus(left) ?? "", historyListStatus(right) ?? "") * direction;
    }
    return compareOptionalText(left.createdAt, right.createdAt, direction);
}
function compareOptionalText(left, right, direction) {
    if (left === null && right === null) {
        return 0;
    }
    if (left === null) {
        return 1;
    }
    if (right === null) {
        return -1;
    }
    return compareText(left, right) * direction;
}
function filterShipments(rows, status, method, keyword) {
    return rows.filter((row) => {
        const statusMatched = status === "ALL" || historyListStatus(row) === status;
        const methodMatched = method === "ALL" || row.returnMethod === method;
        const keywordMatched = includesText(row.receptionNumber, keyword) || includesText(row.customerName, keyword);
        return statusMatched && methodMatched && keywordMatched;
    });
}
function readMethodFilter(value) {
    if (value === "DELIVERY" || value === "PICKUP") {
        return value;
    }
    return "ALL";
}
function readShipmentFilter(value) {
    if (value === "배송 등록 대기"
        || value === "배송 준비 완료"
        || value === "배송 중"
        || value === "배송 완료"
        || value === "방문 수령 대기"
        || value === "방문 수령 완료") {
        return value;
    }
    return "ALL";
}
function historyListStatus(row) {
    if (row.returnMethod === "DELIVERY" && row.status === "READY") {
        return "배송 준비 완료";
    }
    if (row.returnMethod === "DELIVERY" && row.status === "SHIPPING") {
        return "배송 중";
    }
    if (row.returnMethod === "DELIVERY" && row.status === "DELIVERED") {
        return "배송 완료";
    }
    if (row.returnMethod === "PICKUP" && row.status === "READY") {
        return "방문 수령 대기";
    }
    if (row.returnMethod === "PICKUP" && row.status === "PICKED_UP") {
        return "방문 수령 완료";
    }
    return null;
}
function shipmentEmptyText(loading, error) {
    if (loading) {
        return "조회 중";
    }
    if (error !== "") {
        return "배송 내역을 불러오지 못했습니다.";
    }
    return "해당 기간의 배송 내역이 없습니다.";
}
export function summarizeShipmentMethods(rows) {
    const delivery = { ready: 0, shipping: 0, completed: 0 };
    const pickup = { ready: 0, completed: 0 };
    for (const row of rows) {
        if (row.returnMethod === "PICKUP") {
            if (row.status === "READY") {
                pickup.ready += 1;
            }
            else {
                pickup.completed += 1;
            }
            continue;
        }
        if (row.status === "READY") {
            delivery.ready += 1;
        }
        else if (row.status === "SHIPPING") {
            delivery.shipping += 1;
        }
        else {
            delivery.completed += 1;
        }
    }
    return { delivery, pickup };
}
function MethodPanel({ title, loading, metrics }) {
    return (_jsxs("section", { className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", children: [_jsx("h2", { className: "text-sm font-medium text-neutral-700", children: title }), _jsx("div", { className: `mt-3 grid gap-3 ${metrics.length === 3 ? "grid-cols-3" : "grid-cols-2"}`, children: metrics.map(([label, value]) => (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-neutral-500", children: label }), _jsx("p", { className: "mt-2 text-2xl font-semibold text-blue-600", children: loading ? "조회 중" : count(value) })] }, label))) })] }));
}
function count(value) {
    return value === undefined ? "-" : `${value.toLocaleString("ko-KR")}건`;
}
