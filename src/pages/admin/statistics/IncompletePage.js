import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useListParams } from "@/hooks/useListParams";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { SortMenu } from "@/components/ui/SortMenu";
import { isAbortError } from "@/lib/apiClient";
import { isReceptionStatus, receptionStatusLabel } from "@/lib/asReceptionApi";
import { formatDate, includesText } from "@/lib/format";
import { compareText } from "@/lib/guards";
import { fetchLongPendingReceptions } from "@/lib/longPendingApi";
import { useStatisticsPage } from "@/pages/admin/statistics/useStatisticsPage";
import { AS_RECEPTION_STATUSES } from "@/types/asReception";
const pendingStatuses = AS_RECEPTION_STATUSES.filter((status) => status !== "COMPLETED");
export function IncompletePage() {
    const navigate = useNavigate();
    const filters = useListParams();
    const elapsedRaw = filters.text("elapsed", "ALL");
    const elapsed = elapsedRaw === "14" || elapsedRaw === "21" ? elapsedRaw : "ALL";
    const statusRaw = filters.text("status", "ALL");
    const status = statusRaw !== "ALL" && statusRaw !== "COMPLETED" && isReceptionStatus(statusRaw) ? statusRaw : "ALL";
    const appliedKeyword = filters.text("q");
    const [keyword, setKeyword] = useState(appliedKeyword);
    const [receptions, setReceptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const sortRaw = filters.text("sort");
    const sortKey = sortRaw === "number" || sortRaw === "elapsed" || sortRaw === "changedAt" ? sortRaw : null;
    const sortDir = filters.text("dir") === "asc" ? "asc" : "desc";
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        fetchLongPendingReceptions(controller.signal)
            .then((items) => {
            if (!controller.signal.aborted) {
                setReceptions(items);
            }
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause)) {
                return;
            }
            setReceptions([]);
            setError(cause instanceof Error ? cause.message : "장기 미처리 목록을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, []);
    const rows = useMemo(() => {
        const filtered = receptions.filter((row) => {
            const matchedElapsed = elapsed === "ALL" || (elapsed === "14" ? row.elapsedDays >= 14 : row.elapsedDays >= 21);
            const matchedStatus = status === "ALL" || row.status === status;
            const matchedKeyword = includesText(`${row.receptionNumber} ${row.customerName} ${row.modelName} ${row.technicianName ?? ""}`, appliedKeyword);
            return matchedElapsed && matchedStatus && matchedKeyword;
        });
        return sortPending(filtered, sortKey, sortDir);
    }, [appliedKeyword, elapsed, receptions, sortDir, sortKey, status]);
    const list = useStatisticsPage(rows, `${appliedKeyword}|${elapsed}|${status}|${sortKey ?? ""}|${sortDir}`);
    function toggleSort(key) {
        const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
        filters.replace({ sort: key, dir: nextDir, page: null });
    }
    const columns = [
        {
            key: "as",
            header: _jsx(SortMenu, { label: "\uC811\uC218\uBC88\uD638", active: sortKey === "number", direction: sortDir, onToggle: () => toggleSort("number") }),
            render: (row) => row.receptionNumber,
        },
        { key: "customer", header: "고객명", render: (row) => row.customerName },
        { key: "model", header: "모델", render: (row) => row.modelName },
        { key: "status", header: "현재 상태", render: (row) => receptionStatusLabel(row.status) },
        { key: "tech", header: "담당 기사", render: (row) => row.technicianName ?? "-" },
        {
            key: "elapsed",
            header: _jsx(SortMenu, { label: "\uACBD\uACFC\uC77C", active: sortKey === "elapsed", direction: sortDir, onToggle: () => toggleSort("elapsed") }),
            render: (row) => `${row.elapsedDays}일`,
        },
        {
            key: "last",
            header: (_jsx(SortMenu, { label: "\uB9C8\uC9C0\uB9C9 \uC0C1\uD0DC \uBCC0\uACBD\uC77C", active: sortKey === "changedAt", direction: sortDir, onToggle: () => toggleSort("changedAt") })),
            render: (row) => formatDate(row.lastActivityAt),
        },
    ];
    return (_jsxs("div", { children: [_jsx("p", { className: "mb-4", children: _jsx(Link, { to: "/admin/statistics", className: "text-sm text-blue-600", children: "\uD1B5\uACC4/\uB9AC\uD3EC\uD2B8\uB85C \uB3CC\uC544\uAC00\uAE30" }) }), _jsxs("form", { className: "mb-4 flex flex-wrap items-center gap-2", onSubmit: (event) => {
                    event.preventDefault();
                    filters.replace({ q: keyword.trim(), page: null });
                }, children: [_jsx(TextField, { value: keyword, onChange: setKeyword, placeholder: "\uC811\uC218\uBC88\uD638, \uACE0\uAC1D\uBA85", className: "w-48" }), _jsx(Button, { type: "submit", children: "\uAC80\uC0C9" }), _jsx(SelectBox, { value: elapsed, onChange: (value) => {
                            const nextElapsed = value === "14" || value === "21" ? value : "ALL";
                            filters.replace({ elapsed: nextElapsed === "ALL" ? null : nextElapsed, page: null });
                        }, options: [{ value: "ALL", label: "경과일 전체" }, { value: "14", label: "14일 이상" }, { value: "21", label: "21일 이상" }] }), _jsx(SelectBox, { value: status, onChange: (value) => {
                            const nextStatus = value !== "ALL" && value !== "COMPLETED" && isReceptionStatus(value) ? value : "ALL";
                            filters.replace({ status: nextStatus === "ALL" ? null : nextStatus, page: null });
                        }, options: [
                            { value: "ALL", label: "상태 전체" },
                            ...pendingStatuses.map((item) => ({ value: item, label: receptionStatusLabel(item) })),
                        ] })] }), error !== "" && _jsx("div", { className: "mb-3", children: _jsx(Notice, { tone: "error", children: error }) }), _jsx(DataTable, { columns: columns, rows: list.visible, rowKey: (row) => String(row.receptionId), emptyText: loading ? "장기 미처리 목록을 불러오는 중입니다." : "장기 미처리 접수가 없습니다.", onRowClick: (row) => navigate(`/as/details/${row.receptionId}`) }), _jsx(Pagination, { page: list.page, pageCount: list.pageCount, onPageChange: list.setPage })] }));
}
function sortPending(rows, sortKey, sortDir) {
    if (sortKey === null) {
        return rows;
    }
    const direction = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((left, right) => comparePending(left, right, sortKey) * direction);
}
function comparePending(left, right, sortKey) {
    if (sortKey === "number") {
        return compareText(left.receptionNumber, right.receptionNumber);
    }
    if (sortKey === "elapsed") {
        return left.elapsedDays - right.elapsedDays;
    }
    return compareText(left.lastActivityAt, right.lastActivityAt);
}
