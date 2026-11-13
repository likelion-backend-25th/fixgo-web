import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useListParams } from "@/hooks/useListParams";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { createCustomersBulk, downloadCustomerTemplate, searchCustomersPage, validateCustomerBulk, } from "@/lib/customerApi";
import { formatDate } from "@/lib/format";
const PAGE_SIZE = 20;
export function CustomerListPage() {
    const navigate = useNavigate();
    const filters = useListParams();
    const query = filters.text("q");
    const page = filters.page();
    const [appliedKeyword, setAppliedKeyword] = useState(query.trim());
    const [rows, setRows] = useState([]);
    const [pageCount, setPageCount] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [open, setOpen] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const next = query.trim();
            setAppliedKeyword((current) => {
                if (current === next)
                    return current;
                return next;
            });
        }, 300);
        return () => window.clearTimeout(timer);
    }, [query]);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        searchCustomersPage({ keyword: appliedKeyword, page, size: PAGE_SIZE }, controller.signal)
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
            setError(cause instanceof Error ? cause.message : "고객 목록을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [appliedKeyword, page, reloadKey]);
    const columns = [
        { key: "name", header: "고객명", render: (row) => row.name },
        { key: "phone", header: "연락처", render: (row) => row.phone },
        { key: "email", header: "이메일", render: (row) => row.email },
        { key: "date", header: "등록일", render: (row) => formatDate(row.createdAt) },
    ];
    return (_jsxs("div", { children: [error !== "" && _jsx("div", { className: "mb-3", children: _jsx(Notice, { tone: "error", children: error }) }), _jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [_jsx(TextField, { value: query, onChange: (value) => filters.replace({ q: value, page: null }), placeholder: "\uACE0\uAC1D\uBA85, \uC5F0\uB77D\uCC98 \uAC80\uC0C9", className: "w-64" }), _jsx(Button, { className: "ml-auto", onClick: () => setOpen(true), children: "\uC5D1\uC140 \uC77C\uAD04 \uB4F1\uB85D" })] }), _jsx(DataTable, { columns: columns, rows: rows, rowKey: (row) => String(row.id), onRowClick: (row) => navigate(`/customer/${row.id}`), emptyText: loading ? "고객을 조회하는 중입니다." : "조회 결과가 없습니다." }), _jsx(Pagination, { page: page, pageCount: pageCount, onPageChange: filters.setPage }), open && (_jsx(ExcelModal, { onClose: () => setOpen(false), onRegistered: () => {
                    setReloadKey((value) => value + 1);
                    setOpen(false);
                } }))] }));
}
function ExcelModal({ onClose, onRegistered, }) {
    const [fileName, setFileName] = useState("");
    const [rows, setRows] = useState([]);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    async function handleTemplate() {
        setError("");
        try {
            const blob = await downloadCustomerTemplate();
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "customer_template.xlsx";
            link.click();
            URL.revokeObjectURL(url);
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "양식을 내려받지 못했습니다.");
        }
    }
    async function handleUpload(file) {
        if (file === undefined)
            return;
        setPending(true);
        setError("");
        setNotice("");
        setFileName(file.name);
        try {
            const result = await validateCustomerBulk(file);
            setRows(result.rows);
            setNotice(`검증 완료: 등록 가능 ${result.validCount}건 / 오류 ${result.invalidCount}건`);
        }
        catch (cause) {
            setRows([]);
            setError(cause instanceof Error ? cause.message : "엑셀 파일을 검증하지 못했습니다.");
        }
        finally {
            setPending(false);
        }
    }
    async function handleBulkCreate() {
        const customers = rows
            .filter((row) => row.registrable)
            .map((row) => ({
            rowNumber: row.rowNumber,
            name: row.name,
            phone: row.phone,
            email: row.email,
            zipcode: row.zipcode,
            basicAddress: row.basicAddress,
            detailAddress: row.detailAddress,
        }));
        if (customers.length === 0) {
            setError("등록 가능한 고객이 없습니다.");
            return;
        }
        setPending(true);
        setError("");
        try {
            const result = await createCustomersBulk(customers);
            setNotice(`등록 완료: 성공 ${result.successCount}건 / 실패 ${result.failCount}건`);
            if (result.successCount > 0)
                onRegistered();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "고객을 일괄 등록하지 못했습니다.");
        }
        finally {
            setPending(false);
        }
    }
    return (_jsxs(Modal, { title: "\uACE0\uAC1D \uC5D1\uC140 \uC77C\uAD04 \uB4F1\uB85D", onClose: onClose, children: [_jsxs("div", { className: "mb-3 flex gap-2", children: [_jsx(Button, { variant: "outline", onClick: () => void handleTemplate(), disabled: pending, children: "\uC591\uC2DD \uB2E4\uC6B4\uB85C\uB4DC" }), _jsxs("label", { className: "inline-flex cursor-pointer items-center rounded border border-blue-600 px-4 py-2 text-sm text-blue-600", children: ["\uC5D1\uC140 \uC5C5\uB85C\uB4DC", _jsx("input", { type: "file", accept: ".xlsx", className: "sr-only", disabled: pending, onChange: (event) => {
                                    void handleUpload(event.target.files?.[0]);
                                    event.target.value = "";
                                } })] })] }), fileName !== "" && _jsxs("p", { className: "mb-2 text-sm", children: ["\uD30C\uC77C\uBA85 ", fileName] }), error !== "" && _jsx("div", { className: "mb-3", children: _jsx(Notice, { tone: "error", children: error }) }), notice !== "" && _jsx("div", { className: "mb-3", children: _jsx(Notice, { children: notice }) }), _jsx("ul", { className: "divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white text-sm shadow-sm", children: rows.length === 0 ? (_jsx("li", { className: "px-3 py-6 text-center text-neutral-500", children: "\uAC80\uC99D\uB41C \uD589\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (rows.map((row) => (_jsxs("li", { className: "flex justify-between gap-3 px-3 py-2", children: [_jsxs("span", { children: [row.name || "(이름 없음)", " \u00B7 ", row.phone] }), _jsx("span", { className: row.registrable ? "text-green-600" : "text-red-600", children: row.registrable ? "등록 가능" : (row.reason ?? "형식 오류") })] }, row.rowNumber)))) }), _jsx("div", { className: "mt-4 text-right", children: _jsx(Button, { onClick: () => void handleBulkCreate(), disabled: pending || rows.every((row) => !row.registrable), children: "\uACE0\uAC1D \uC77C\uAD04 \uB4F1\uB85D" }) })] }));
}
