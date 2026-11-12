import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Notice } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { fetchEmailDetail, fetchEmailHistory, retryNotificationEmail } from "@/lib/notificationApi";
const PAGE_SIZE = 20;
function displaySentAt(value) {
    if (value === null || value === "") {
        return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value.replaceAll("-", ".");
    }
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function statusLabel(status) {
    if (status === "SENT") {
        return "성공";
    }
    if (status === "FAILED") {
        return "실패";
    }
    if (status === "SENDING") {
        return "발송중";
    }
    return "대기";
}
function statusClass(status) {
    if (status === "SENT") {
        return "text-green-600";
    }
    if (status === "FAILED") {
        return "text-red-600";
    }
    return "text-neutral-600";
}
export function NotificationListPage() {
    const [query, setQuery] = useState("");
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [page, setPage] = useState(1);
    const [applied, setApplied] = useState({ keyword: "", startDate: "", endDate: "" });
    const [rows, setRows] = useState([]);
    const [total, setTotal] = useState(0);
    const [pageCount, setPageCount] = useState(1);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState(null);
    const [retryingId, setRetryingId] = useState(null);
    const dateInvalid = from !== "" && to !== "" && from > to;
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const next = { keyword: query.trim(), startDate: from, endDate: to };
            setApplied((current) => {
                if (current.keyword === next.keyword && current.startDate === next.startDate && current.endDate === next.endDate) {
                    return current;
                }
                return next;
            });
            setPage(1);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [from, query, to]);
    useEffect(() => {
        if (applied.startDate !== "" && applied.endDate !== "" && applied.startDate > applied.endDate) {
            setRows([]);
            setTotal(0);
            setPageCount(1);
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        fetchEmailHistory({
            keyword: applied.keyword,
            startDate: applied.startDate,
            endDate: applied.endDate,
            page,
            size: PAGE_SIZE,
        }, controller.signal)
            .then((result) => {
            setRows(result.items);
            setTotal(result.totalElements);
            setPageCount(Math.max(1, result.totalPages));
            setError("");
        })
            .catch((cause) => {
            if (cause instanceof DOMException && cause.name === "AbortError") {
                return;
            }
            setRows([]);
            setTotal(0);
            setPageCount(1);
            setError(cause instanceof Error ? cause.message : "이메일 발송 내역을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [applied, page]);
    async function retry(id) {
        if (retryingId !== null) {
            return;
        }
        setRetryingId(id);
        setError("");
        setNotice("");
        try {
            const result = await retryNotificationEmail(id);
            setRows((current) => current.map((row) => (row.id === id
                ? { ...row, status: result.status, sentAt: result.sentAt ?? row.sentAt }
                : row)));
            if (result.status === "FAILED") {
                setError("이메일 발송에 실패했습니다.");
                return;
            }
            setNotice("이메일을 다시 발송했습니다.");
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "이메일 재발송에 실패했습니다.");
        }
        finally {
            setRetryingId(null);
        }
    }
    const columns = [
        { key: "id", header: "번호", render: (row) => row.id },
        { key: "at", header: "발송일시", render: (row) => displaySentAt(row.sentAt) },
        { key: "name", header: "고객명", render: (row) => row.customerName ?? "-" },
        { key: "email", header: "수신 이메일", render: (row) => row.recipientEmail },
        { key: "body", header: "내용", render: (row) => row.messageTitle },
        {
            key: "status",
            header: "발송 상태",
            render: (row) => _jsx("span", { className: statusClass(row.status), children: statusLabel(row.status) }),
        },
        {
            key: "detail",
            header: "",
            render: (row) => (_jsxs("div", { className: "flex items-center gap-2 whitespace-nowrap", children: [_jsx(Button, { onClick: () => setSelectedId(row.id), children: "\uC0C1\uC138 \uBCF4\uAE30" }), row.status === "FAILED" && (_jsx(Button, { disabled: retryingId === row.id, onClick: () => void retry(row.id), children: "\uBC1C\uC1A1" }))] })),
        },
    ];
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [_jsxs("p", { className: "text-sm text-neutral-500", children: ["\uC804\uCCB4 ", total, "\uAC74"] }), _jsx(TextField, { value: query, onChange: setQuery, placeholder: "\uACE0\uAC1D\uBA85, \uC774\uBA54\uC77C \uAC80\uC0C9", className: "w-56" }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [_jsx(TextField, { type: "date", value: from, onChange: setFrom, className: "w-40" }), _jsx("span", { className: "text-sm text-neutral-500", children: "~" }), _jsx(TextField, { type: "date", value: to, onChange: setTo, className: "w-40" })] })] }), dateInvalid && _jsx(Notice, { tone: "error", children: "\uC2DC\uC791\uC77C\uC740 \uC885\uB8CC\uC77C\uBCF4\uB2E4 \uB2A6\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." }), notice !== "" && _jsx(Notice, { children: notice }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsx(DataTable, { columns: columns, rows: rows, rowKey: (row) => String(row.id), emptyText: loading ? "발송 내역을 불러오는 중입니다." : "조건에 맞는 발송 내역이 없습니다." }), _jsx(Pagination, { page: page, pageCount: pageCount, onPageChange: setPage }), selectedId !== null && _jsx(EmailDetailModal, { id: selectedId, onClose: () => setSelectedId(null) })] }));
}
function EmailDetailModal({ id, onClose }) {
    const [detail, setDetail] = useState(null);
    const [error, setError] = useState("");
    useEffect(() => {
        const controller = new AbortController();
        fetchEmailDetail(id, controller.signal)
            .then((result) => {
            setDetail(result);
            setError("");
        })
            .catch((cause) => {
            if (cause instanceof DOMException && cause.name === "AbortError") {
                return;
            }
            setDetail(null);
            setError(cause instanceof Error ? cause.message : "이메일 상세를 불러오지 못했습니다.");
        });
        return () => controller.abort();
    }, [id]);
    const failed = detail?.notificationStatus === "FAILED";
    const receptionNumber = detail?.receptionNumber?.trim() ?? "";
    return (_jsxs(Modal, { title: "\uC774\uBA54\uC77C \uBC1C\uC1A1 \uC0C1\uC138", wide: true, onClose: onClose, children: [error !== "" && _jsx(Notice, { tone: "error", children: error }), detail === null && error === "" && _jsx("p", { className: "text-sm text-neutral-500", children: "\uC0C1\uC138\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." }), detail !== null && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-3", children: [_jsx(Field, { label: "\uBC1C\uC1A1\uBC88\uD638", value: detail.id }), _jsx(Field, { label: "\uBC1C\uC1A1\uC77C\uC2DC", value: displaySentAt(detail.sentAt) }), _jsx(Field, { label: "\uBC1C\uC1A1 \uC0C1\uD0DC", value: _jsx("span", { className: statusClass(detail.notificationStatus), children: statusLabel(detail.notificationStatus) }) })] }), _jsx("h3", { className: "mt-5 mb-2 text-sm font-medium", children: "\uC218\uC2E0\uC790 \uC815\uBCF4" }), _jsxs("div", { className: cn("grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", receptionNumber === "" ? "sm:grid-cols-2" : "sm:grid-cols-3"), children: [_jsx(Field, { label: "\uACE0\uAC1D\uBA85", value: detail.customerName ?? "-" }), receptionNumber !== "" && _jsx(Field, { label: "\uC811\uC218\uBC88\uD638", value: receptionNumber }), _jsx(Field, { label: "\uC774\uBA54\uC77C", value: detail.recipientEmail })] }), _jsx("h3", { className: "mt-5 mb-2 text-sm font-medium", children: "\uC774\uBA54\uC77C \uC81C\uBAA9" }), _jsx("p", { className: "rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm", children: detail.messageTitle }), _jsx("h3", { className: "mt-5 mb-2 text-sm font-medium", children: "\uC774\uBA54\uC77C \uB0B4\uC6A9" }), _jsx("p", { className: "whitespace-pre-line rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm", children: detail.message }), _jsx("h3", { className: "mt-5 mb-2 text-sm font-medium", children: "\uBC1C\uC1A1 \uACB0\uACFC" }), _jsx("div", { className: "overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm", children: _jsxs("table", { className: "w-full border-collapse text-sm", children: [_jsx("thead", { className: "bg-neutral-100 text-left", children: _jsx("tr", { children: ["결과", "발송 시각"].map((header) => (_jsx("th", { className: "px-3 py-2 font-medium", children: header }, header))) }) }), _jsx("tbody", { children: _jsxs("tr", { className: "border-t border-neutral-200", children: [_jsx("td", { className: cn("px-3 py-2", failed ? "text-red-600" : "text-green-600"), children: failed ? "실패" : statusLabel(detail.notificationStatus) }), _jsx("td", { className: "px-3 py-2", children: displaySentAt(detail.sentAt) })] }) })] }) })] }))] }));
}
function Field({ label, value }) {
    return (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-neutral-500", children: label }), _jsx("p", { className: "mt-1 text-sm", children: value })] }));
}
