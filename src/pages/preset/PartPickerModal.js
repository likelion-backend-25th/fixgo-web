import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectBox } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { won } from "@/lib/format";
import { fetchParts, isPartStatus, partStatusLabel, } from "@/lib/partApi";
import { fetchProductModels } from "@/lib/productModelApi";
const PAGE_SIZE = 20;
export function PartPickerModal({ selectedIds, onAdd, onClose }) {
    const [name, setName] = useState("");
    const [appliedName, setAppliedName] = useState("");
    const [category, setCategory] = useState("");
    const [modelId, setModelId] = useState("");
    const [status, setStatus] = useState("");
    const [models, setModels] = useState([]);
    const [parts, setParts] = useState([]);
    const [page, setPage] = useState(1);
    const [pageCount, setPageCount] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setAppliedName(name.trim());
            setPage(1);
        }, 300);
        return () => window.clearTimeout(timer);
    }, [name]);
    useEffect(() => {
        const controller = new AbortController();
        fetchProductModels({ keyword: "", page: 1, size: 200 }, controller.signal)
            .then((result) => setModels(result.items))
            .catch((cause) => {
            if (!isAbortError(cause)) {
                setModels([]);
            }
        });
        return () => controller.abort();
    }, []);
    useEffect(() => {
        const controller = new AbortController();
        const parsedModelId = Number(modelId);
        setLoading(true);
        // 호환 제품군·모델·재고 상태는 서버 검색 조건으로 보낸다.
        fetchParts({
            partName: appliedName,
            status: status === "" ? null : status,
            category: category === "" ? null : category,
            productModelId: modelId !== "" && Number.isInteger(parsedModelId) ? parsedModelId : null,
            page,
            size: PAGE_SIZE,
        }, controller.signal)
            .then((result) => {
            setParts(result.content);
            setPageCount(Math.max(1, result.totalPages));
            setError("");
        })
            .catch((cause) => {
            if (isAbortError(cause)) {
                return;
            }
            setParts([]);
            setPageCount(1);
            setError(cause instanceof Error ? cause.message : "부품 목록을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [appliedName, category, modelId, status, page]);
    const modelOptions = useMemo(() => models.filter((model) => category === "" || model.category === category), [models, category]);
    function changeCategory(value) {
        const next = isCategory(value) ? value : "";
        setCategory(next);
        setModelId((current) => {
            if (current === "" || next === "") {
                return current;
            }
            const model = models.find((item) => String(item.id) === current);
            return model !== undefined && model.category === next ? current : "";
        });
        setPage(1);
    }
    return (_jsx(Modal, { title: "\uBD80\uD488 \uCD94\uAC00", wide: true, onClose: onClose, children: _jsxs("div", { className: "flex h-[520px] max-h-[calc(100vh-14rem)] min-h-0 flex-col", children: [_jsxs("div", { className: "flex shrink-0 flex-wrap gap-2", children: [_jsx("input", { value: name, onChange: (event) => setName(event.target.value), placeholder: "\uBD80\uD488\uBA85 \uAC80\uC0C9", className: "h-9 min-w-40 flex-1 rounded-lg border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-blue-500" }), _jsx(SelectBox, { "aria-label": "\uD638\uD658 \uC81C\uD488\uAD70", value: category, onChange: changeCategory, options: [
                                { value: "", label: "호환 제품군 전체" },
                                { value: "LAPTOP", label: "노트북" },
                                { value: "PHONE", label: "스마트폰" },
                            ] }), _jsx(SelectBox, { "aria-label": "\uBAA8\uB378", value: modelId, onChange: (value) => {
                                setModelId(value);
                                setPage(1);
                            }, options: [
                                { value: "", label: "모델 전체" },
                                ...modelOptions.map((model) => ({
                                    value: String(model.id),
                                    label: `${model.modelName} · ${model.name}`,
                                })),
                            ] }), _jsx(SelectBox, { "aria-label": "\uC7AC\uACE0 \uC0C1\uD0DC", value: status, onChange: (value) => {
                                setStatus(isPartStatus(value) ? value : "");
                                setPage(1);
                            }, options: [
                                { value: "", label: "재고 상태 전체" },
                                { value: "ACTIVE", label: partStatusLabel("ACTIVE") },
                                { value: "LOW_QUANTITY", label: partStatusLabel("LOW_QUANTITY") },
                                { value: "DISCONTINUED", label: partStatusLabel("DISCONTINUED") },
                            ] })] }), error !== "" && (_jsx("div", { className: "mt-3 shrink-0", children: _jsx(Notice, { tone: "error", children: error }) })), _jsx("div", { className: "mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto", children: loading ? (_jsx("p", { className: "py-8 text-center text-sm text-neutral-400", children: "\uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." })) : parts.length === 0 ? (_jsx("p", { className: "py-8 text-center text-sm text-neutral-400", children: "\uC870\uAC74\uC5D0 \uB9DE\uB294 \uBD80\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (parts.map((part) => {
                        const added = selectedIds.includes(part.id);
                        return (_jsxs("div", { className: "flex items-center gap-3 border border-neutral-300 px-3 py-2 text-sm", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "font-medium", children: part.name }), _jsxs("p", { className: "mt-1 text-xs text-neutral-500", children: [partStatusLabel(part.status), " \u00B7 \uC7AC\uACE0 ", part.stockQuantity, " \u00B7 ", won(part.unitPrice)] })] }), _jsx(Button, { variant: "outline", disabled: added, onClick: () => onAdd(part), children: added ? "추가됨" : "추가" })] }, part.id));
                    })) }), _jsx("div", { className: "shrink-0", children: _jsx(Pagination, { page: page, pageCount: pageCount, onPageChange: setPage }) })] }) }));
}
function isCategory(value) {
    return value === "LAPTOP" || value === "PHONE";
}
