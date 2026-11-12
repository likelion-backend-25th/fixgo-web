import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Pagination } from "@/components/ui/Pagination";
import { Notice } from "@/components/ui/Panel";
import { won } from "@/lib/format";
import { fetchPaymentList, paymentBillStatusLabel, paymentMethodLabel, } from "@/lib/paymentApi";
const PAGE_SIZE = 20;
const statusOptions = [
    { value: "ALL", label: "상태 전체" },
    { value: "UNPAID", label: "결제 대기" },
    { value: "PAID", label: "결제 완료" },
    { value: "REFUNDED", label: "환불 완료" },
];
export function PaymentListPage() {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("ALL");
    const [page, setPage] = useState(1);
    const [applied, setApplied] = useState({ keyword: "", status: "ALL" });
    const filterKey = `${applied.keyword}:${applied.status}`;
    const [seenFilter, setSeenFilter] = useState(filterKey);
    const [rows, setRows] = useState([]);
    const [pageCount, setPageCount] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    if (seenFilter !== filterKey) {
        setSeenFilter(filterKey);
        setPage(1);
    }
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const next = { keyword: query.trim(), status };
            setApplied((current) => {
                if (current.keyword === next.keyword && current.status === next.status) {
                    return current;
                }
                return next;
            });
        }, 300);
        return () => window.clearTimeout(timer);
    }, [query, status]);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        setRows([]);
        fetchPaymentList({
            keyword: applied.keyword,
            status: applied.status === "ALL" ? null : applied.status,
            page,
            size: PAGE_SIZE,
        }, controller.signal)
            .then((result) => {
            if (controller.signal.aborted) {
                return;
            }
            setRows(result.items);
            setPageCount(Math.max(1, result.totalPages));
        })
            .catch((cause) => {
            if (controller.signal.aborted || (cause instanceof DOMException && cause.name === "AbortError")) {
                return;
            }
            setRows([]);
            setPageCount(1);
            setError(cause instanceof Error ? cause.message : "결제 내역을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [applied, page]);
    const columns = [
        { key: "as", header: "접수번호", render: (row) => row.asReceptionNumber },
        { key: "customer", header: "고객", render: (row) => row.customerName },
        { key: "amount", header: "금액", render: (row) => won(row.amount) },
        { key: "status", header: "상태", render: (row) => paymentBillStatusLabel(row.status) },
        { key: "method", header: "수단", render: (row) => paymentMethodLabel(row.paymentMethod) },
        { key: "approvedAt", header: "승인시각", render: (row) => formatApprovedAt(row.approvedAt) },
        {
            key: "detail",
            header: "",
            render: (row) => (_jsx(Button, { onClick: () => navigate(`/payment/${row.billId}`), children: "\uC0C1\uC138 \uBCF4\uAE30" })),
        },
    ];
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-4 flex flex-wrap gap-2", children: [_jsx(TextField, { value: query, onChange: setQuery, placeholder: "\uC811\uC218\uBC88\uD638, \uACE0\uAC1D\uBA85 \uAC80\uC0C9", className: "w-64" }), _jsx(SelectBox, { value: status, onChange: (value) => {
                            if (isStatusFilter(value)) {
                                setStatus(value);
                            }
                        }, options: statusOptions })] }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsx(DataTable, { columns: columns, rows: rows, rowKey: (row) => String(row.billId), emptyText: tableMessage(loading, error) }), _jsx(Pagination, { page: page, pageCount: pageCount, onPageChange: setPage })] }));
}
function formatApprovedAt(value) {
    if (value === null || value.trim() === "") {
        return "-";
    }
    const matched = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value);
    if (matched === null) {
        return value;
    }
    return `${matched[1]} ${matched[2]}`;
}
function tableMessage(loading, error) {
    if (loading) {
        return "결제 내역을 불러오는 중입니다.";
    }
    if (error !== "") {
        return "결제 내역을 불러오지 못했습니다.";
    }
    return "조회 결과가 없습니다.";
}
function isStatusFilter(value) {
    return statusOptions.some((option) => option.value === value);
}
