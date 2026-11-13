import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import { formatDate, won } from "@/lib/format";
import { fetchLaborRates, updateLaborRate } from "@/lib/laborRateApi";
import { categoryToLabel } from "@/lib/productModelApi";
export function CostListPage() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [editing, setEditing] = useState(null);
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        fetchLaborRates(controller.signal)
            .then((result) => {
            setRows(result);
            setError("");
        })
            .catch((cause) => {
            if (isAbortError(cause)) {
                return;
            }
            setRows([]);
            setError(cause instanceof Error ? cause.message : "공임비·점검비 목록을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, []);
    return (_jsxs("div", { className: "space-y-4", children: [notice !== "" && _jsx(Notice, { children: notice }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsx(RateTable, { title: "\uACF5\uC784\uBE44", rateType: "LABOR_RATE", rows: rows, loading: loading, onSelect: setEditing }), _jsx(RateTable, { title: "\uC810\uAC80\uBE44", rateType: "INSPECTION_COST", rows: rows, loading: loading, onSelect: setEditing }), editing !== null && (_jsx(CostEditModal, { row: editing, onClose: () => setEditing(null), onSaved: (updated) => {
                setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
                setEditing(null);
                setError("");
                setNotice(updated.rateType === "LABOR_RATE" ? "공임비를 수정했습니다." : "점검비를 수정했습니다.");
            } }))] }));
}
function RateTable({ title, rateType, rows, loading, onSelect, }) {
    const visible = rows.filter((row) => row.rateType === rateType);
    const columns = [
        { key: "no", header: "번호", render: (row) => visible.findIndex((item) => item.id === row.id) + 1 },
        { key: "product", header: "제품", render: (row) => categoryToLabel(row.productCategory) },
        { key: "amount", header: "금액", render: (row) => won(row.cost) },
        { key: "effectiveDate", header: "적용일", render: (row) => formatDate(row.effectiveDate) },
    ];
    return (_jsxs("section", { children: [_jsx("h2", { className: "section-title mb-3", children: title }), _jsx(DataTable, { columns: columns, rows: visible, rowKey: (row) => String(row.id), onRowClick: onSelect, emptyText: loading ? "불러오는 중입니다." : "등록된 기준이 없습니다." })] }));
}
function CostEditModal({ row, onClose, onSaved, }) {
    const [cost, setCost] = useState(String(row.cost));
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    const labor = row.rateType === "LABOR_RATE";
    async function save() {
        const trimmed = cost.trim();
        if (!/^\d+$/.test(trimmed)) {
            setError("금액은 0 이상의 정수로 입력해 주세요.");
            return;
        }
        const amount = Number(trimmed);
        setPending(true);
        setError("");
        try {
            onSaved(await updateLaborRate(row.id, amount));
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "금액을 수정하지 못했습니다.");
        }
        finally {
            setPending(false);
        }
    }
    return (_jsx(Modal, { title: labor ? "공임비 수정" : "점검비 수정", onClose: () => { if (!pending)
            onClose(); }, children: _jsxs("form", { className: "space-y-3", onSubmit: (event) => {
                event.preventDefault();
                void save();
            }, children: [_jsx("p", { className: "text-sm text-[#1E293B]", children: categoryToLabel(row.productCategory) }), _jsx(TextField, { label: "\uAE08\uC561", value: cost, onChange: setCost, placeholder: "0" }), labor && _jsx("p", { className: "text-xs text-[#64748B]", children: "10\uBD84\uB2F9 \uAE08\uC561\uC785\uB2C8\uB2E4." }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", disabled: pending, onClick: onClose, children: "\uCDE8\uC18C" }), _jsx(Button, { type: "submit", disabled: pending, children: pending ? "저장 중…" : "저장" })] })] }) }));
}
