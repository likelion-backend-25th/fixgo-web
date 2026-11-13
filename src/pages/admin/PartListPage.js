import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { SelectBox, TextArea, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { fetchParts, isPartStatus, partStatusLabel, updatePartMinutes, updatePartPrice, updatePartStatus, updatePartStock, } from "@/lib/partApi";
const PAGE_SIZE = 20;
export function PartListPage() {
    const [query, setQuery] = useState("");
    const [applied, setApplied] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [pageCount, setPageCount] = useState(1);
    const [rows, setRows] = useState([]);
    const [inbound, setInbound] = useState(false);
    const [editing, setEditing] = useState(null);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [reloadKey, setReloadKey] = useState(0);
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
        fetchParts({
            partName: applied,
            status: status === "" ? null : status,
            page,
            size: PAGE_SIZE,
        }, controller.signal)
            .then((result) => {
            setRows(result.content);
            setPageCount(Math.max(1, result.totalPages));
            setError("");
        })
            .catch((cause) => {
            if (isAbortError(cause)) {
                return;
            }
            setRows([]);
            setPageCount(1);
            setError(cause instanceof Error ? cause.message : "부품 목록을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [applied, status, page, reloadKey]);
    const columns = [
        { key: "no", header: "번호", render: (row) => (page - 1) * PAGE_SIZE + rows.findIndex((item) => item.id === row.id) + 1 },
        { key: "name", header: "부품명", render: (row) => row.name },
        { key: "price", header: "단가", render: (row) => row.unitPrice.toLocaleString("ko-KR") },
        { key: "minutes", header: "표준 작업시간", render: (row) => `${row.standardMinutes}분` },
        { key: "stock", header: "재고", render: (row) => row.stockQuantity },
        { key: "status", header: "상태", render: (row) => _jsx("span", { className: statusClass(row.status), children: partStatusLabel(row.status) }) },
        {
            key: "manage",
            header: "관리",
            render: (row) => _jsx(Button, { variant: "outline", onClick: () => setEditing(row), children: "\uC218\uC815" }),
        },
    ];
    return (_jsxs("div", { children: [notice !== "" && _jsx(Notice, { children: notice }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [_jsx(TextField, { value: query, onChange: setQuery, placeholder: "\uBD80\uD488\uBA85", className: "w-64" }), _jsx(SelectBox, { value: status, onChange: (value) => {
                            setStatus(isPartStatus(value) ? value : "");
                            setPage(1);
                        }, options: [
                            { value: "", label: "상태 전체" },
                            { value: "ACTIVE", label: "사용" },
                            { value: "LOW_QUANTITY", label: "재고 부족" },
                            { value: "DISCONTINUED", label: "단종" },
                        ] }), _jsx(Button, { className: "ml-auto", onClick: () => setInbound(true), children: "\uC785\uACE0 \uB4F1\uB85D" })] }), _jsx(DataTable, { columns: columns, rows: rows, rowKey: (row) => String(row.id), emptyText: loading ? "불러오는 중입니다." : "부품이 없습니다." }), _jsx(Pagination, { page: page, pageCount: pageCount, onPageChange: setPage }), inbound && (_jsx(StockModal, { onClose: () => setInbound(false), onSaved: () => {
                    setInbound(false);
                    setNotice("입고 수량을 반영했습니다.");
                    setError("");
                    setReloadKey((current) => current + 1);
                } })), editing !== null && (_jsx(PartEditModal, { initial: editing, onClose: () => setEditing(null), onSaved: (message) => {
                    setEditing(null);
                    setNotice(message);
                    setError("");
                    setReloadKey((current) => current + 1);
                } }))] }));
}
function statusClass(status) {
    if (status === "ACTIVE")
        return "text-green-600";
    if (status === "LOW_QUANTITY")
        return "text-orange-500";
    return cn("text-red-600");
}
function StockModal({ onClose, onSaved }) {
    const [keyword, setKeyword] = useState("");
    const [options, setOptions] = useState([]);
    const [part, setPart] = useState(null);
    const [picking, setPicking] = useState(false);
    const [changeType, setChangeType] = useState("IN");
    const [qty, setQty] = useState("20");
    const [reason, setReason] = useState("공급사 정기 입고");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        fetchParts({ partName: keyword.trim(), page: 1, size: 20 }, controller.signal)
            .then((result) => setOptions(result.content))
            .catch((cause) => {
            if (!isAbortError(cause)) {
                setOptions([]);
            }
        });
        return () => controller.abort();
    }, [keyword]);
    async function submit() {
        const count = Number(qty);
        if (part === null || !Number.isInteger(count) || count <= 0 || reason.trim() === "") {
            setError("부품, 입고 수량, 사유를 확인해 주세요.");
            return;
        }
        if (changeType === "OUT" && count > part.stockQuantity) {
            setError("출고 수량이 현재 재고보다 많습니다.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await updatePartStock(part.id, changeType, count, reason.trim());
            onSaved();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "부품 재고를 수정하지 못했습니다.");
            setSaving(false);
        }
    }
    return (_jsx(Modal, { title: "\uC785\uACE0 \uB4F1\uB85D", onClose: onClose, children: _jsxs("form", { className: "space-y-3", onSubmit: (event) => {
                event.preventDefault();
                void submit();
            }, children: [_jsxs("div", { children: [_jsx("span", { className: "mb-1 block text-sm", children: "\uBD80\uD488" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(TextField, { className: "flex-1", value: part === null ? "" : part.name, onChange: () => undefined, readOnly: true }), _jsx(Button, { variant: "outline", onClick: () => setPicking((open) => !open), children: "\uAC80\uC0C9" })] }), picking && (_jsxs("ul", { className: "mt-2 max-h-40 overflow-auto rounded border border-neutral-300 text-sm", children: [_jsx("li", { className: "border-b border-neutral-200 p-2", children: _jsx(TextField, { value: keyword, onChange: setKeyword, placeholder: "\uBD80\uD488\uBA85" }) }), options.map((row) => (_jsx("li", { children: _jsx("button", { type: "button", className: "w-full px-3 py-2 text-left hover:bg-blue-50", onClick: () => {
                                            setPart(row);
                                            setPicking(false);
                                        }, children: row.name }) }, row.id)))] }))] }), _jsxs("label", { className: "block text-sm", children: [_jsx("span", { className: "mb-1 block", children: "\uBCC0\uB3D9 \uC720\uD615" }), _jsx(SelectBox, { className: "w-full", value: changeType, onChange: (value) => setChangeType(value === "OUT" ? "OUT" : "IN"), options: [
                                { value: "IN", label: "입고" },
                                { value: "OUT", label: "출고" },
                            ] })] }), _jsx(TextField, { label: "\uD604\uC7AC \uC7AC\uACE0", value: String(part?.stockQuantity ?? 0), onChange: () => undefined, readOnly: true }), _jsx(TextField, { label: "\uC785\uACE0 \uC218\uB7C9", value: qty, onChange: setQty }), _jsx(TextArea, { label: "\uC0AC\uC720", value: reason, onChange: setReason, rows: 3 }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: onClose, children: "\uCDE8\uC18C" }), _jsx(Button, { type: "submit", disabled: saving, children: "\uB4F1\uB85D" })] })] }) }));
}
function PartEditModal({ initial, onClose, onSaved, }) {
    const [price, setPrice] = useState(String(initial.unitPrice));
    const [minutes, setMinutes] = useState(String(initial.standardMinutes));
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    async function submit() {
        const parsed = Number(price.replace(/[^\d]/g, ""));
        const parsedMinutes = Number(minutes);
        if (!Number.isInteger(parsed) || parsed < 0) {
            setError("단가는 0 이상의 숫자로 입력해 주세요.");
            return;
        }
        if (!Number.isInteger(parsedMinutes) || parsedMinutes < 0) {
            setError("표준 작업시간은 0 이상의 숫자로 입력해 주세요.");
            return;
        }
        setSaving(true);
        try {
            await updatePartPrice(initial.id, parsed);
            await updatePartMinutes(initial.id, parsedMinutes);
            onSaved("부품 정보를 수정했습니다.");
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "부품 정보를 수정하지 못했습니다.");
            setSaving(false);
        }
    }
    const previousStatus = initial.stockQuantity > 0 ? "ACTIVE" : "LOW_QUANTITY";
    async function changeStatus(status) {
        setSaving(true);
        setError("");
        try {
            await updatePartStatus(initial.id, status);
            onSaved(status === "DISCONTINUED" ? "부품을 단종 처리했습니다." : "부품 상태를 이전으로 되돌렸습니다.");
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "부품 상태를 수정하지 못했습니다.");
            setSaving(false);
        }
    }
    return (_jsx(Modal, { title: "\uBD80\uD488 \uC218\uC815", onClose: onClose, children: _jsxs("form", { className: "space-y-3", onSubmit: (event) => {
                event.preventDefault();
                void submit();
            }, children: [_jsx(TextField, { label: "\uBD80\uD488\uBA85", value: initial.name, onChange: () => undefined, readOnly: true }), _jsx(TextField, { label: "\uB2E8\uAC00", value: price, onChange: setPrice }), _jsx(TextField, { label: "\uD45C\uC900 \uC791\uC5C5\uC2DC\uAC04(\uBD84)", value: minutes, onChange: setMinutes }), _jsx(TextField, { label: "\uC0C1\uD0DC", value: partStatusLabel(initial.status), onChange: () => undefined, readOnly: true }), initial.status === "DISCONTINUED"
                ? _jsx(Button, { type: "button", variant: "outline", disabled: saving, onClick: () => void changeStatus(previousStatus), children: `${partStatusLabel(previousStatus)}으로 되돌리기` })
                : _jsx(Button, { type: "button", variant: "outline", disabled: saving, onClick: () => void changeStatus("DISCONTINUED"), children: "\uB2E8\uC885 \uCC98\uB9AC" }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: onClose, children: "\uCDE8\uC18C" }), _jsx(Button, { type: "submit", disabled: saving, children: "\uC218\uC815" })] })] }) }));
}
