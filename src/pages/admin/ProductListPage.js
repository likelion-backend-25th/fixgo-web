import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import { compareText } from "@/lib/guards";
import { categoryToLabel, createProductModel, fetchProductModels, productModelStatusLabel, updateProductModel, } from "@/lib/productModelApi";
import { useSessionStore } from "@/stores/useSessionStore";
const PAGE_SIZE = 20;
export function ProductListPage() {
    const isAdmin = useSessionStore((state) => state.user?.role) === "ADMIN";
    const [query, setQuery] = useState("");
    const [appliedKeyword, setAppliedKeyword] = useState("");
    const [page, setPage] = useState(1);
    const [rows, setRows] = useState([]);
    const [sortKey, setSortKey] = useState("");
    const [sortDir, setSortDir] = useState("asc");
    const [pageCount, setPageCount] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [editing, setEditing] = useState(null);
    const [creating, setCreating] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    useEffect(() => {
        const timer = window.setTimeout(() => {
            const next = query.trim();
            setAppliedKeyword((current) => {
                if (current === next)
                    return current;
                setPage(1);
                return next;
            });
        }, 300);
        return () => window.clearTimeout(timer);
    }, [query]);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError("");
        fetchProductModels({ keyword: appliedKeyword, page, size: PAGE_SIZE }, controller.signal)
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
            setError(cause instanceof Error ? cause.message : "지원 품목 목록을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted)
                setLoading(false);
        });
        return () => controller.abort();
    }, [appliedKeyword, page, reloadKey]);
    const visible = useMemo(() => {
        if (sortKey === "") {
            return rows;
        }
        return [...rows].sort((left, right) => {
            const result = compareText(valueOf(left, sortKey), valueOf(right, sortKey));
            return sortDir === "asc" ? result : -result;
        });
    }, [rows, sortDir, sortKey]);
    const columns = [
        { key: "modelName", header: "모델명", sortable: true, render: (row) => row.modelName },
        { key: "productName", header: "제품명", sortable: true, render: (row) => row.name },
        { key: "group", header: "제품군", sortable: true, render: (row) => categoryToLabel(row.category) },
        { key: "warranty", header: "보증", sortable: true, render: (row) => `${row.warrantyMonths}개월` },
        {
            key: "status",
            header: "상태",
            sortable: true,
            render: (row) => (_jsx("span", { className: cn(row.isActive ? "text-green-600" : "text-red-600"), children: productModelStatusLabel(row.isActive) })),
        },
        ...(isAdmin
            ? [{
                    key: "edit",
                    header: "",
                    render: (row) => (_jsx(Button, { variant: "outline", onClick: () => setEditing(row), children: "\uC218\uC815" })),
                }]
            : []),
    ];
    async function save(input) {
        if (editing === null) {
            await createProductModel({
                name: input.name,
                modelName: input.modelName,
                category: input.category,
                warrantyMonths: input.warrantyMonths,
            });
            setNotice("지원 모델을 등록했습니다.");
        }
        else {
            await updateProductModel(editing.id, input);
            setNotice("지원 모델을 수정했습니다.");
        }
        setCreating(false);
        setEditing(null);
        setReloadKey((value) => value + 1);
    }
    return (_jsxs("div", { children: [notice !== "" && _jsx("div", { className: "mb-3", children: _jsx(Notice, { children: notice }) }), error !== "" && _jsx("div", { className: "mb-3", children: _jsx(Notice, { tone: "error", children: error }) }), _jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [_jsx(TextField, { value: query, onChange: setQuery, placeholder: "\uBAA8\uB378\uBA85, \uC81C\uD488\uBA85", className: "w-64" }), isAdmin && _jsx(Button, { className: "ml-auto", onClick: () => setCreating(true), children: "\uBAA8\uB378 \uB4F1\uB85D" })] }), _jsx(DataTable, { columns: columns, rows: visible, rowKey: (row) => String(row.id), emptyText: loading ? "지원 품목을 불러오는 중입니다." : "조회 결과가 없습니다.", sortKey: sortKey === "" ? undefined : sortKey, sortDir: sortDir, onSort: (key) => {
                    if (sortKey === key) {
                        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
                        return;
                    }
                    setSortKey(key);
                    setSortDir("asc");
                } }), _jsx(Pagination, { page: page, pageCount: pageCount, onPageChange: setPage }), (creating || editing !== null) && (_jsx(ModelModal, { initial: editing, onClose: () => {
                    setCreating(false);
                    setEditing(null);
                }, onSave: save }))] }));
}
function valueOf(row, key) {
    if (key === "productName")
        return row.name;
    if (key === "group")
        return categoryToLabel(row.category);
    if (key === "warranty")
        return String(row.warrantyMonths);
    if (key === "status")
        return productModelStatusLabel(row.isActive);
    return row.modelName;
}
function ModelModal({ initial, onClose, onSave, }) {
    const [modelName, setModelName] = useState(initial?.modelName ?? "");
    const [productName, setProductName] = useState(initial?.name ?? "");
    const [category, setCategory] = useState(initial?.category ?? "PHONE");
    const [warranty, setWarranty] = useState(initial?.warrantyMonths ?? 12);
    const warrantyChoices = warranty === 12 || warranty === 24 ? [12, 24] : [warranty, 12, 24];
    const [isActive, setIsActive] = useState(initial?.isActive ?? true);
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    return (_jsx(Modal, { title: initial === null ? "모델 등록" : "모델 수정", onClose: onClose, children: _jsxs("form", { className: "space-y-4", onSubmit: (event) => {
                event.preventDefault();
                if (modelName.trim() === "" || productName.trim() === "") {
                    setError("모델명과 제품명을 입력해 주세요.");
                    return;
                }
                setPending(true);
                setError("");
                void onSave({
                    name: productName.trim(),
                    modelName: modelName.trim(),
                    category,
                    warrantyMonths: warranty,
                    isActive,
                })
                    .catch((cause) => {
                    setError(cause instanceof Error ? cause.message : "저장하지 못했습니다.");
                })
                    .finally(() => setPending(false));
            }, children: [_jsx("p", { className: "text-sm text-neutral-500", children: "\uC9C0\uC6D0 \uD488\uBAA9 \uBAA9\uB85D\uC5D0 \uBAA8\uB378\uC744 \uCD94\uAC00\uD569\uB2C8\uB2E4." }), _jsxs("div", { className: "space-y-4", children: [_jsx(TextField, { label: "\uBAA8\uB378\uBA85", value: modelName, onChange: setModelName }), _jsx(TextField, { label: "\uC81C\uD488\uBA85", value: productName, onChange: setProductName }), _jsx(Radios, { label: "\uC81C\uD488\uAD70", value: category, options: ["PHONE", "LAPTOP"], labels: ["스마트폰", "노트북"], onChange: (value) => setCategory(value) }), _jsx(Radios, { label: "\uBCF4\uC99D", value: String(warranty), options: warrantyChoices.map(String), labels: warrantyChoices.map((months) => `${months}개월`), onChange: (value) => setWarranty(Number(value)) }), _jsx(Radios, { label: "\uC0C1\uD0DC", value: isActive ? "사용" : "단종", options: ["사용", "단종"], onChange: (value) => setIsActive(value === "사용") })] }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: onClose, disabled: pending, children: "\uCDE8\uC18C" }), _jsx(Button, { type: "submit", disabled: pending, children: initial === null ? "등록" : "수정" })] })] }) }));
}
function Radios({ label, value, options, labels, onChange, }) {
    return (_jsxs("fieldset", { children: [_jsx("legend", { className: "mb-2 text-sm", children: label }), _jsx("div", { className: "flex gap-4 text-sm", children: options.map((option, index) => (_jsxs("label", { className: "flex items-center gap-1.5", children: [_jsx("input", { type: "radio", name: label, checked: value === option, onChange: () => onChange(option) }), labels?.[index] ?? option] }, option))) })] }));
}
