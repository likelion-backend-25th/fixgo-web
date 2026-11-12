import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { DataTable } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { fetchStatusHistories, fetchTechnicianHistories, historyStatusLabel, receptionStatusLabel, } from "@/lib/asReceptionApi";
import { formatDateTime } from "@/lib/format";
import { AS_RECEPTION_STATUSES, REPAIR_STATUSES } from "@/types/asReception";
const PAGE_SIZE = 20;
const statusOptions = [
    { value: "", label: "전체" },
    ...AS_RECEPTION_STATUSES.map((status) => ({ value: status, label: receptionStatusLabel(status) })),
    ...REPAIR_STATUSES
        .filter((status) => !AS_RECEPTION_STATUSES.includes(status))
        .map((status) => ({ value: status, label: historyStatusLabel(status) })),
];
export function AllocationHistoryPage() {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [applied, setApplied] = useState("");
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState([]);
    const [pageCount, setPageCount] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setApplied(query.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [query]);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        fetchTechnicianHistories({ keyword: applied, page, size: PAGE_SIZE }, controller.signal)
            .then((result) => {
            if (controller.signal.aborted)
                return;
            setRows(result.items);
            setPageCount(Math.max(1, result.totalPages));
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause))
                return;
            setRows([]);
            setPageCount(1);
            setError(cause instanceof Error ? cause.message : "기사 배정 이력을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [applied, page]);
    const columns = [
        { key: "at", header: "일시", render: (row) => formatDateTime(row.createdAt) },
        { key: "as", header: "접수번호", render: (row) => row.receptionNumber },
        { key: "customer", header: "고객명", render: (row) => row.customerName },
        { key: "model", header: "모델", render: (row) => row.modelName ?? "-" },
        { key: "category", header: "구분", render: (row) => row.previousTechnicianName === null ? "최초 배정" : "변경" },
        { key: "before", header: "이전 기사", render: (row) => row.previousTechnicianName ?? "-" },
        { key: "after", header: "변경 기사", render: (row) => row.newTechnicianName ?? "-" },
        { key: "actor", header: "변경자", render: (row) => row.changedBy ?? "-" },
        { key: "reason", header: "사유", render: (row) => row.reason ?? "-" },
    ];
    return (_jsxs("div", { children: [error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsx(TextField, { value: query, onChange: setQuery, placeholder: "\uC811\uC218\uBC88\uD638, \uACE0\uAC1D, \uAE30\uC0AC, \uC0AC\uC720 \uAC80\uC0C9", className: "mb-4 w-72" }), _jsx(DataTable, { columns: columns, rows: rows, rowKey: (row) => String(row.id), onRowClick: (row) => navigate(`/as/details/${row.receptionId}`), emptyText: loading ? "기사 배정 이력을 불러오는 중입니다." : "기사 배정 이력이 없습니다." }), _jsx(Pagination, { page: page, pageCount: pageCount, onPageChange: setPage })] }));
}
export function StatusHistoryPage() {
    const navigate = useNavigate();
    const [status, setStatus] = useState("");
    const [query, setQuery] = useState("");
    const [applied, setApplied] = useState({ keyword: "", status: "" });
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState([]);
    const [pageCount, setPageCount] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setApplied({ keyword: query.trim(), status });
            setPage(1);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [query, status]);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        fetchStatusHistories({ keyword: applied.keyword, toStatus: applied.status === "" ? null : applied.status, page, size: PAGE_SIZE }, controller.signal)
            .then((result) => {
            if (controller.signal.aborted)
                return;
            setRows(result.items);
            setPageCount(Math.max(1, result.totalPages));
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause))
                return;
            setRows([]);
            setPageCount(1);
            setError(cause instanceof Error ? cause.message : "상태 변경 이력을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [applied, page]);
    const columns = [
        { key: "at", header: "일시", render: (row) => formatDateTime(row.createdAt) },
        { key: "as", header: "접수번호", render: (row) => row.receptionNumber },
        { key: "customer", header: "고객명", render: (row) => row.customerName },
        { key: "model", header: "모델", render: (row) => row.modelName ?? "-" },
        { key: "before", header: "이전 상태", render: (row) => historyStatusLabel(row.fromStatus) },
        { key: "after", header: "변경 상태", render: (row) => historyStatusLabel(row.toStatus) },
        { key: "actor", header: "변경자", render: (row) => row.changedBy ?? "-" },
        { key: "reason", header: "사유", render: (row) => row.reason ?? "-" },
    ];
    return (_jsxs("div", { children: [error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "mb-4 flex gap-2", children: [_jsx(TextField, { value: query, onChange: setQuery, placeholder: "\uC811\uC218\uBC88\uD638, \uACE0\uAC1D\uBA85, \uC0AC\uC720 \uAC80\uC0C9", className: "w-64" }), _jsx(SelectBox, { value: status, onChange: setStatus, options: statusOptions })] }), _jsx(DataTable, { columns: columns, rows: rows, rowKey: (row) => String(row.id), onRowClick: (row) => navigate(`/as/details/${row.receptionId}`), emptyText: loading ? "상태 변경 이력을 불러오는 중입니다." : "상태 변경 이력이 없습니다." }), _jsx(Pagination, { page: page, pageCount: pageCount, onPageChange: setPage })] }));
}
