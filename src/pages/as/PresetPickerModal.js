import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { categoryLabel, fetchProduct } from "@/lib/asReceptionApi";
import { won } from "@/lib/format";
import { createRepairPreset, fetchRepairPresetParts, fetchRepairPresetsBySymptom, fetchSymptomPresets, } from "@/lib/repair";
import { PresetFormModal } from "@/pages/preset/PresetFormModal";
export function PresetPickerModal({ productId, onClose, onApply }) {
    const [symptoms, setSymptoms] = useState([]);
    const [symptomsLoading, setSymptomsLoading] = useState(true);
    const [productCategory, setProductCategory] = useState(null);
    const [categoryReady, setCategoryReady] = useState(false);
    const [symptomQuery, setSymptomQuery] = useState("");
    const [selectedSymptomId, setSelectedSymptomId] = useState(null);
    const [presets, setPresets] = useState([]);
    const [presetsLoading, setPresetsLoading] = useState(false);
    const [presetQuery, setPresetQuery] = useState("");
    const [selectedPresetIds, setSelectedPresetIds] = useState([]);
    const [partsByPresetId, setPartsByPresetId] = useState(new Map());
    const [partsLoadingIds, setPartsLoadingIds] = useState([]);
    const [applying, setApplying] = useState(false);
    const [creating, setCreating] = useState(false);
    const [presetReloadKey, setPresetReloadKey] = useState(0);
    const [error, setError] = useState("");
    const loadedSymptomId = useRef(null);
    useEffect(() => {
        const controller = new AbortController();
        fetchProduct(productId, controller.signal)
            .then((product) => setProductCategory(categoryLabel(product.category)))
            .catch((cause) => {
            if (controller.signal.aborted)
                return;
            setError(cause instanceof Error ? cause.message : "제품군을 확인하지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted)
                setCategoryReady(true);
        });
        return () => controller.abort();
    }, [productId]);
    useEffect(() => {
        const controller = new AbortController();
        fetchSymptomPresets(controller.signal)
            .then(setSymptoms)
            .catch((cause) => {
            if (controller.signal.aborted)
                return;
            setError(cause instanceof Error ? cause.message : "고장 증상을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted)
                setSymptomsLoading(false);
        });
        return () => controller.abort();
    }, []);
    useEffect(() => {
        if (selectedSymptomId === null) {
            setPresets([]);
            return;
        }
        const controller = new AbortController();
        setPresetsLoading(true);
        // 증상을 바꿀 때만 선택을 비운다. 등록 후 새로고침은 고른 프리셋을 유지한다.
        if (loadedSymptomId.current !== selectedSymptomId) {
            loadedSymptomId.current = selectedSymptomId;
            setPresets([]);
            setSelectedPresetIds([]);
            setPartsByPresetId(new Map());
            setPartsLoadingIds([]);
        }
        fetchRepairPresetsBySymptom(selectedSymptomId, controller.signal)
            .then((result) => {
            if (!controller.signal.aborted)
                setPresets(result);
        })
            .catch((cause) => {
            if (controller.signal.aborted)
                return;
            setError(cause instanceof Error ? cause.message : "수리 프리셋을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted)
                setPresetsLoading(false);
        });
        return () => controller.abort();
    }, [selectedSymptomId, presetReloadKey]);
    const visibleSymptoms = useMemo(() => {
        const keyword = symptomQuery.trim().toLowerCase();
        return symptoms.filter((symptom) => (productCategory === null || symptom.productCategory === productCategory) &&
            symptom.name.toLowerCase().includes(keyword));
    }, [productCategory, symptomQuery, symptoms]);
    const visiblePresets = useMemo(() => {
        const keyword = presetQuery.trim().toLowerCase();
        return presets.filter((preset) => preset.name.toLowerCase().includes(keyword) ||
            (preset.description ?? "").toLowerCase().includes(keyword));
    }, [presetQuery, presets]);
    const selectedSymptom = symptoms.find((symptom) => symptom.id === selectedSymptomId);
    const selectedPresets = selectedPresetIds
        .map((id) => presets.find((preset) => preset.id === id))
        .filter((preset) => preset !== undefined);
    const partsLoading = selectedPresetIds.some((id) => partsLoadingIds.includes(id));
    const partsTotal = selectedPresets.reduce((sum, preset) => {
        const parts = partsByPresetId.get(preset.id) ?? [];
        return sum + parts.reduce((partSum, part) => partSum + part.unitPrice * part.quantity, 0);
    }, 0);
    async function togglePreset(preset) {
        setError("");
        if (selectedPresetIds.includes(preset.id)) {
            setSelectedPresetIds((current) => current.filter((id) => id !== preset.id));
            return;
        }
        setSelectedPresetIds((current) => [...current, preset.id]);
        if (partsByPresetId.has(preset.id))
            return;
        setPartsLoadingIds((current) => [...current, preset.id]);
        try {
            const parts = await fetchRepairPresetParts(preset.id);
            setPartsByPresetId((current) => {
                const next = new Map(current);
                next.set(preset.id, parts);
                return next;
            });
        }
        catch (cause) {
            setSelectedPresetIds((current) => current.filter((id) => id !== preset.id));
            setError(cause instanceof Error ? cause.message : "소모 부품을 불러오지 못했습니다.");
        }
        finally {
            setPartsLoadingIds((current) => current.filter((id) => id !== preset.id));
        }
    }
    async function apply() {
        if (selectedSymptom === undefined || selectedPresets.length === 0) {
            setError("고장 증상과 수리 프리셋을 선택해 주세요.");
            return;
        }
        if (partsLoading)
            return;
        const choices = selectedPresets.map((preset) => ({
            preset,
            parts: partsByPresetId.get(preset.id) ?? [],
        }));
        setApplying(true);
        setError("");
        try {
            await onApply({ symptom: selectedSymptom, presets: choices });
            onClose();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "점검 항목을 반영하지 못했습니다.");
        }
        finally {
            setApplying(false);
        }
    }
    return (_jsxs(Modal, { title: "\uC218\uB9AC \uD504\uB9AC\uC14B \uBD88\uB7EC\uC624\uAE30", wide: true, onClose: onClose, children: [_jsx("p", { className: "mb-3 text-sm text-neutral-500", children: `${productCategory === null ? "고장 증상" : `${productCategory} 고장 증상`}을 고른 뒤, 그 증상의 수리 프리셋을 여러 개 선택할 수 있습니다.` }), _jsxs("div", { className: "grid gap-3 lg:grid-cols-3", children: [_jsx(PickerColumn, { title: "1. \uACE0\uC7A5 \uC99D\uC0C1", search: _jsx(SearchBox, { value: symptomQuery, onChange: setSymptomQuery, placeholder: "\uC99D\uC0C1\uBA85 \uAC80\uC0C9" }), children: symptomsLoading || !categoryReady ? (_jsx(EmptyText, { children: "\uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." })) : visibleSymptoms.length === 0 ? (_jsx(EmptyText, { children: "\uC774 \uC81C\uD488\uAD70\uC5D0 \uB4F1\uB85D\uB41C \uACE0\uC7A5 \uC99D\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (visibleSymptoms.map((symptom) => (_jsx(ChoiceButton, { selected: symptom.id === selectedSymptomId, title: symptom.name, onClick: () => {
                                setError("");
                                setSelectedSymptomId(symptom.id);
                            } }, symptom.id)))) }), _jsx(PickerColumn, { title: "2. \uC218\uB9AC \uD504\uB9AC\uC14B (\uC5EC\uB7EC \uAC1C \uC120\uD0DD)", search: _jsx(SearchBox, { value: presetQuery, onChange: setPresetQuery, placeholder: "\uD504\uB9AC\uC14B\uBA85 \uAC80\uC0C9" }), children: selectedSymptomId === null ? (_jsx(EmptyText, { children: "\uACE0\uC7A5 \uC99D\uC0C1\uC744 \uBA3C\uC800 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694." })) : presetsLoading ? (_jsx(EmptyText, { children: "\uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." })) : visiblePresets.length === 0 ? (_jsx(EmptyText, { children: "\uC774 \uC99D\uC0C1\uC5D0 \uC5F0\uACB0\uB41C \uC218\uB9AC \uD504\uB9AC\uC14B\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (visiblePresets.map((preset) => (_jsx(ChoiceButton, { selected: selectedPresetIds.includes(preset.id), title: preset.name, detail: preset.description || "설명 없음", onClick: () => void togglePreset(preset) }, preset.id)))) }), _jsx(PickerColumn, { title: "3. \uC18C\uBAA8 \uBD80\uD488", children: selectedPresets.length === 0 ? (_jsx(EmptyText, { children: "\uC218\uB9AC \uD504\uB9AC\uC14B\uC744 \uC120\uD0DD\uD558\uBA74 \uBD80\uD488\uC774 \uD45C\uC2DC\uB429\uB2C8\uB2E4." })) : (_jsxs(_Fragment, { children: [selectedPresets.map((preset) => {
                                    const parts = partsByPresetId.get(preset.id);
                                    return (_jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-sm font-medium", children: preset.name }), parts === undefined ? (_jsx(EmptyText, { children: "\uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." })) : parts.length === 0 ? (_jsx(EmptyText, { children: "\uC774 \uD504\uB9AC\uC14B\uC5D0 \uB4F1\uB85D\uB41C \uBD80\uD488\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (parts.map((part) => (_jsxs("div", { className: "rounded-lg border border-neutral-200 px-3 py-2 text-sm", children: [_jsx("p", { className: "font-medium", children: part.partName }), _jsxs("p", { className: "mt-1 text-neutral-500", children: [part.quantity, "\uAC1C \u00B7 ", won(part.unitPrice), " \u00B7 ", part.standardMinutes, "\uBD84"] })] }, part.partId))))] }, preset.id));
                                }), _jsxs("p", { className: "px-1 text-right text-sm font-semibold text-blue-700", children: ["\uBD80\uD488 \uD569\uACC4 ", won(partsTotal)] })] })) })] }), error !== "" && _jsx("p", { className: "mt-3 text-sm text-red-600", children: error }), _jsxs("div", { className: "mt-4 flex items-center justify-between gap-2", children: [_jsx(Button, { variant: "outline", onClick: () => setCreating(true), children: "\uD504\uB9AC\uC14B \uB4F1\uB85D" }), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { variant: "ghost", onClick: onClose, children: "\uCDE8\uC18C" }), _jsx(Button, { onClick: () => void apply(), disabled: applying || partsLoading || selectedSymptom === undefined || selectedPresets.length === 0, children: applying ? "반영 중…" : `점검 항목에 추가${selectedPresets.length > 1 ? ` (${selectedPresets.length})` : ""}` })] })] }), creating && (_jsx(PresetFormModal, { onClose: () => setCreating(false), onSave: async (request) => {
                    await createRepairPreset(request);
                    setCreating(false);
                    setPresetReloadKey((key) => key + 1);
                } }))] }));
}
function PickerColumn({ title, search, children, }) {
    return (_jsxs("section", { className: "flex h-96 flex-col rounded-xl border border-neutral-200 p-3", children: [_jsx("h3", { className: "mb-2 text-sm font-semibold", children: title }), search, _jsx("div", { className: "mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto", children: children })] }));
}
function SearchBox({ value, onChange, placeholder, }) {
    return (_jsx("input", { value: value, onChange: (event) => onChange(event.target.value), placeholder: placeholder, className: "rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500" }));
}
function ChoiceButton({ selected, title, detail, onClick, }) {
    return (_jsxs("button", { type: "button", onClick: onClick, className: `rounded-lg border px-3 py-2 text-left text-sm ${selected ? "border-blue-500 bg-blue-50" : "border-neutral-200 bg-white hover:border-blue-300"}`, children: [_jsx("span", { className: "block font-medium", children: title }), detail !== undefined && _jsx("span", { className: "mt-1 block text-xs text-neutral-500", children: detail })] }));
}
function EmptyText({ children }) {
    return _jsx("p", { className: "py-8 text-center text-sm text-neutral-500", children: children });
}
