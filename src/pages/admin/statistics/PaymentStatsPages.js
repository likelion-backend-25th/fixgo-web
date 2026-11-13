import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useListParams } from "@/hooks/useListParams";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { SortMenu } from "@/components/ui/SortMenu";
import { isAbortError } from "@/lib/apiClient";
import { formatDate, includesText, won } from "@/lib/format";
import { compareText } from "@/lib/guards";
import { fetchDepositWaiting, paymentBillStatusLabel } from "@/lib/paymentApi";
import { fetchPaymentHistory, fetchPaymentStatistics } from "@/lib/statisticsApi";
import { PeriodFilter, StatisticsBackLink } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPage } from "@/pages/admin/statistics/useStatisticsPage";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
import { useStatisticsResource } from "@/pages/admin/statistics/useStatisticsResource";
export function DepositWaitingPage() {
    const filters = useListParams();
    const appliedKeyword = filters.text("q");
    const [keyword, setKeyword] = useState(appliedKeyword);
    const sortRaw = filters.text("sort");
    const sortKey = sortRaw === "number" || sortRaw === "customer" || sortRaw === "model" || sortRaw === "amount" || sortRaw === "billed" || sortRaw === "elapsed" || sortRaw === "status" ? sortRaw : null;
    const sortDir = filters.text("dir") === "desc" ? "desc" : "asc";
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        fetchDepositWaiting(controller.signal)
            .then((items) => {
            if (!controller.signal.aborted) {
                setBills(items);
            }
        })
            .catch((reason) => {
            if (isAbortError(reason) || controller.signal.aborted) {
                return;
            }
            setError(reason instanceof Error ? reason.message : "입금 대기 내역을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, []);
    const filtered = useMemo(() => sortDeposits(filterDeposits(bills, appliedKeyword), sortKey, sortDir), [appliedKeyword, bills, sortDir, sortKey]);
    const list = useStatisticsPage(filtered, `${appliedKeyword}|${sortKey ?? ""}|${sortDir}`);
    const total = filtered.reduce((sum, row) => sum + row.amount, 0);
    function toggleSort(key) {
        const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
        filters.replace({ sort: key, dir: nextDir, page: null });
    }
    function search() {
        filters.replace({ q: keyword.trim(), page: null });
    }
    return (_jsxs("div", { children: [_jsx(StatisticsBackLink, {}), _jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [_jsx(TextField, { value: keyword, onChange: setKeyword, placeholder: "\uACE0\uAC1D\uBA85", className: "w-40" }), _jsx(Button, { onClick: search, children: "\uAC80\uC0C9" })] }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("p", { className: "mb-3 text-sm text-neutral-700", children: ["\uB300\uAE30 ", loading ? "조회 중" : `${filtered.length.toLocaleString("ko-KR")}건`, " \uD569\uACC4 ", loading ? "조회 중" : won(total)] }), _jsx(DataTable, { columns: depositColumns(sortKey, sortDir, toggleSort), rows: list.visible, rowKey: (row) => String(row.billId), emptyText: loading ? "입금 대기 내역을 불러오는 중입니다." : "조회 결과가 없습니다." }), _jsxs("p", { className: "mt-3 text-sm font-medium text-neutral-800", children: ["\uD569\uACC4 ", loading ? "조회 중" : won(total)] }), _jsx(Pagination, { page: list.page, pageCount: list.pageCount, onPageChange: list.setPage })] }));
}
function depositColumns(sortKey, sortDir, toggleSort) {
    return [
        column("number", "접수번호", sortKey, sortDir, toggleSort, (row) => row.asReceptionNumber),
        column("customer", "고객", sortKey, sortDir, toggleSort, (row) => row.customerName),
        column("model", "모델", sortKey, sortDir, toggleSort, (row) => row.modelName ?? "-"),
        column("amount", "견적금액", sortKey, sortDir, toggleSort, (row) => won(row.amount)),
        column("billed", "청구일", sortKey, sortDir, toggleSort, (row) => formatDate(row.billedAt)),
        column("elapsed", "경과일", sortKey, sortDir, toggleSort, (row) => elapsedLabel(row.billedAt)),
        column("status", "상태", sortKey, sortDir, toggleSort, (row) => (_jsx("span", { className: "text-orange-500", children: depositStatusLabel(row.status) }))),
    ];
}
function column(key, label, sortKey, sortDir, toggleSort, render) {
    return {
        key,
        header: _jsx(SortMenu, { label: label, active: sortKey === key, direction: sortDir, onToggle: () => toggleSort(key) }),
        render,
    };
}
function filterDeposits(rows, keyword) {
    return rows.filter((row) => includesText(row.customerName, keyword));
}
function elapsedDays(billedAt) {
    if (billedAt === null) {
        return null;
    }
    const billed = new Date(`${billedAt.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(billed.getTime())) {
        return null;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((today.getTime() - billed.getTime()) / 86_400_000));
}
function elapsedLabel(billedAt) {
    const days = elapsedDays(billedAt);
    return days === null ? "-" : `${days}일`;
}
function depositStatusLabel(status) {
    return status === "UNPAID" ? "미입금" : paymentBillStatusLabel(status);
}
function sortDeposits(rows, sortKey, sortDir) {
    if (sortKey === null) {
        return rows;
    }
    const direction = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((left, right) => compareDeposit(left, right, sortKey, direction));
}
function compareDeposit(left, right, sortKey, direction) {
    if (sortKey === "number") {
        return compareText(left.asReceptionNumber, right.asReceptionNumber) * direction;
    }
    if (sortKey === "customer") {
        return compareText(left.customerName, right.customerName) * direction;
    }
    if (sortKey === "model") {
        return compareText(left.modelName ?? "", right.modelName ?? "") * direction;
    }
    if (sortKey === "amount") {
        return (left.amount - right.amount) * direction;
    }
    if (sortKey === "billed") {
        return compareOptional(left.billedAt, right.billedAt, direction);
    }
    if (sortKey === "elapsed") {
        return compareOptionalNumber(elapsedDays(left.billedAt), elapsedDays(right.billedAt), direction);
    }
    return compareText(depositStatusLabel(left.status), depositStatusLabel(right.status)) * direction;
}
function compareOptional(left, right, direction) {
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
function compareOptionalNumber(left, right, direction) {
    if (left === null && right === null) {
        return 0;
    }
    if (left === null) {
        return 1;
    }
    if (right === null) {
        return -1;
    }
    return (left - right) * direction;
}
export function RepairCostPage() {
    const payment = usePaymentSummary();
    return (_jsxs("div", { children: [_jsx(StatisticsBackLink, {}), _jsx(PeriodFilter, {}), payment.error !== "" && _jsx(Notice, { tone: "error", children: payment.error }), _jsxs("div", { className: "grid gap-3 md:grid-cols-4", children: [_jsx(SummaryCard, { label: "\uC218\uB0A9", value: payment.loading ? "조회 중" : money(payment.data?.totalPaidAmount), hint: "\uC2B9\uC778 \uC644\uB8CC" }), _jsx(SummaryCard, { label: "\uD658\uBD88", value: payment.loading ? "조회 중" : money(payment.data?.totalRefundAmount), hint: "\uD658\uBD88 \uC644\uB8CC" }), _jsx(SummaryCard, { label: "\uC21C\uC218\uB0A9", value: payment.loading ? "조회 중" : money(payment.data?.netCollectedAmount), hint: "\uC218\uB0A9\uC5D0\uC11C \uD658\uBD88\uC744 \uBE80 \uAE08\uC561" }), _jsx(SummaryCard, { label: "\uD604\uC7AC \uBBF8\uC785\uAE08", value: payment.loading ? "조회 중" : count(payment.data?.unpaidCount), hint: "\uCCAD\uAD6C\uC11C \uAE30\uC900" })] }), _jsx(PaymentHistorySection, {})] }));
}
const historyFilters = [
    { value: "ALL", label: "전체" },
    { value: "PAID", label: "입금" },
    { value: "UNPAID", label: "미입금" },
    { value: "REFUNDED", label: "환불" },
];
function PaymentHistorySection() {
    const navigate = useNavigate();
    const filters = useListParams();
    const { startDate, endDate, invalid } = useStatisticsPeriod();
    const history = useStatisticsResource(fetchPaymentHistory, startDate, endDate, invalid);
    const status = readHistoryFilter(filters.text("status", "ALL"));
    const appliedKeyword = filters.text("q");
    const [keyword, setKeyword] = useState(appliedKeyword);
    const sortRaw = filters.text("sort");
    const sortKey = sortRaw === "number" || sortRaw === "customer" || sortRaw === "amount" || sortRaw === "status" || sortRaw === "date" ? sortRaw : null;
    const sortDir = filters.text("dir") === "desc" ? "desc" : "asc";
    const rows = useMemo(() => sortHistory(filterHistory(history.data ?? [], status, appliedKeyword), sortKey, sortDir), [appliedKeyword, history.data, sortDir, sortKey, status]);
    const list = useStatisticsPage(rows, `${startDate}|${endDate}|${status}|${appliedKeyword}|${sortKey ?? ""}|${sortDir}`);
    function toggleSort(key) {
        const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
        filters.replace({ sort: key, dir: nextDir, page: null });
    }
    return (_jsxs("section", { className: "mt-4", children: [_jsxs("div", { className: "mb-3 flex flex-wrap items-center justify-between gap-2", children: [_jsx("h2", { className: "section-title", children: "\uACB0\uC81C \uB0B4\uC5ED" }), _jsxs("form", { className: "flex flex-wrap items-center gap-2", onSubmit: (event) => {
                        event.preventDefault();
                        filters.replace({ q: keyword.trim(), page: null });
                    }, children: [_jsx(TextField, { value: keyword, onChange: setKeyword, placeholder: "\uC811\uC218\uBC88\uD638, \uACE0\uAC1D\uBA85", className: "w-48" }), _jsx(Button, { type: "submit", children: "\uAC80\uC0C9" }), _jsx(SelectBox, { value: status, onChange: (value) => {
                        const next = readHistoryFilter(value);
                        filters.replace({ status: next === "ALL" ? null : next, page: null });
                    }, options: historyFilters })] })] }), history.error !== "" && _jsx(Notice, { tone: "error", children: history.error }), _jsx(DataTable, { columns: historyColumns(sortKey, sortDir, toggleSort), rows: list.visible, rowKey: (row) => `${row.status}-${row.billId}-${row.occurredAt ?? ""}`, onRowClick: (row) => navigate(`/payment/${row.billId}`), emptyText: historyEmptyText(history.loading, history.error) }), _jsx(Pagination, { page: list.page, pageCount: list.pageCount, onPageChange: list.setPage })] }));
}
function historyColumns(sortKey, sortDir, toggleSort) {
    return [
        historyColumn("number", "접수번호", sortKey, sortDir, toggleSort, (row) => row.receptionNumber),
        historyColumn("customer", "고객", sortKey, sortDir, toggleSort, (row) => row.customerName),
        historyColumn("amount", "금액", sortKey, sortDir, toggleSort, (row) => won(row.amount)),
        historyColumn("status", "상태", sortKey, sortDir, toggleSort, (row) => _jsx("span", { className: historyStatusClass(row.status), children: historyStatusLabel(row.status) })),
        historyColumn("date", "일자", sortKey, sortDir, toggleSort, (row) => formatDate(row.occurredAt)),
    ];
}
function historyColumn(key, label, sortKey, sortDir, toggleSort, render) {
    return {
        key,
        header: _jsx(SortMenu, { label: label, active: sortKey === key, direction: sortDir, onToggle: () => toggleSort(key) }),
        render,
    };
}
function sortHistory(rows, sortKey, sortDir) {
    if (sortKey === null) {
        return rows;
    }
    const direction = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((left, right) => compareHistory(left, right, sortKey, direction));
}
function compareHistory(left, right, sortKey, direction) {
    if (sortKey === "number") {
        return compareText(left.receptionNumber, right.receptionNumber) * direction;
    }
    if (sortKey === "customer") {
        return compareText(left.customerName, right.customerName) * direction;
    }
    if (sortKey === "amount") {
        return (left.amount - right.amount) * direction;
    }
    if (sortKey === "status") {
        return compareText(historyStatusLabel(left.status), historyStatusLabel(right.status)) * direction;
    }
    return compareOptionalText(left.occurredAt, right.occurredAt, direction);
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
function historyEmptyText(loading, error) {
    if (loading) {
        return "조회 중";
    }
    if (error !== "") {
        return "결제 내역을 불러오지 못했습니다.";
    }
    return "해당 기간의 결제 내역이 없습니다.";
}
function filterHistory(rows, status, keyword) {
    return rows.filter((row) => {
        const statusMatched = status === "ALL" || row.status === status;
        const keywordMatched = includesText(row.receptionNumber, keyword) || includesText(row.customerName, keyword);
        return statusMatched && keywordMatched;
    });
}
function readHistoryFilter(value) {
    if (value === "PAID" || value === "UNPAID" || value === "REFUNDED") {
        return value;
    }
    return "ALL";
}
function historyStatusLabel(status) {
    if (status === "PAID") {
        return "입금";
    }
    if (status === "UNPAID") {
        return "미입금";
    }
    return "환불";
}
function historyStatusClass(status) {
    if (status === "UNPAID") {
        return "text-orange-500";
    }
    if (status === "PAID") {
        return "text-blue-600";
    }
    return "text-neutral-500";
}
function usePaymentSummary() {
    const { startDate, endDate, invalid } = useStatisticsPeriod();
    const resource = useStatisticsResource(fetchPaymentStatistics, startDate, endDate, invalid);
    return { ...resource, invalid };
}
function SummaryCard({ label, value, hint }) {
    return (_jsxs("div", { className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", children: [_jsx("p", { className: "text-sm text-neutral-500", children: label }), _jsx("p", { className: "mt-2 text-2xl font-semibold text-blue-600", children: value }), _jsx("p", { className: "mt-1 text-xs text-neutral-500", children: hint })] }));
}
function count(value) {
    return value === undefined ? "-" : `${value.toLocaleString("ko-KR")}건`;
}
function money(value) {
    return value === undefined ? "-" : won(value);
}
