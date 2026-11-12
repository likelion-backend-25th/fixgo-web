import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { fetchRepairPresetParts, fetchRepairPresetsBySymptom, fetchSymptomPresets, } from "@/lib/repair";
import { won } from "@/lib/format";
import { PartPickerModal } from "./PartPickerModal";
// "기타 (직접입력)" 선택 값
const ETC = "etc";
const safeNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
};
export function PresetFormModal({ onClose, onSave }) {
    // 서버 데이터
    const [allSymptoms, setAllSymptoms] = useState([]);
    const [presets, setPresets] = useState([]);
    const [presetsLoading, setPresetsLoading] = useState(false);
    // 1열: 고장 증상
    const [category, setCategory] = useState("");
    const [symptomSearch, setSymptomSearch] = useState("");
    const [selectedSymptom, setSelectedSymptom] = useState(null);
    const [symptomEtc, setSymptomEtc] = useState("");
    // 2열: 수리 프리셋
    const [presetSearch, setPresetSearch] = useState("");
    const [selectedPreset, setSelectedPreset] = useState(null);
    const [presetEtc, setPresetEtc] = useState("");
    // 3열: 부품 목록 및 비용
    const [selectedParts, setSelectedParts] = useState([]);
    const [partPickerOpen, setPartPickerOpen] = useState(false);
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);
    // 고장 증상 조회
    useEffect(() => {
        const controller = new AbortController();
        fetchSymptomPresets(controller.signal)
            .then(setAllSymptoms)
            .catch((err) => {
            if (controller.signal.aborted)
                return;
            setError(err instanceof Error
                ? err.message
                : "고장 증상 목록을 불러오지 못했습니다.");
        });
        return () => controller.abort();
    }, []);
    // 선택한 증상에 연결된 수리 프리셋 조회
    useEffect(() => {
        if (typeof selectedSymptom !== "number") {
            setPresets([]);
            return;
        }
        const controller = new AbortController();
        setPresetsLoading(true);
        fetchRepairPresetsBySymptom(selectedSymptom, controller.signal)
            .then(setPresets)
            .catch((err) => {
            if (controller.signal.aborted)
                return;
            setPresets([]);
            setError(err instanceof Error
                ? err.message
                : "해당 증상의 수리 프리셋을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted)
                setPresetsLoading(false);
        });
        return () => controller.abort();
    }, [selectedSymptom]);
    // 제품군 목록
    const categories = useMemo(() => Array.from(new Set(allSymptoms.map((s) => s.productCategory))), [allSymptoms]);
    // 고장 증상 검색 (제품군 + 증상명)
    const filteredSymptoms = useMemo(() => {
        const keyword = symptomSearch.trim().toLowerCase();
        return allSymptoms.filter((symptom) => (category === "" || symptom.productCategory === category) &&
            symptom.name.toLowerCase().includes(keyword));
    }, [allSymptoms, category, symptomSearch]);
    // 수리 프리셋 검색
    const filteredPresets = useMemo(() => {
        const keyword = presetSearch.trim().toLowerCase();
        return presets.filter((preset) => preset.name.toLowerCase().includes(keyword) ||
            (preset.description ?? "").toLowerCase().includes(keyword));
    }, [presets, presetSearch]);
    // 고장 증상 선택 -> 하위 선택 초기화
    const handleSelectSymptom = (symptom) => {
        setSelectedSymptom(symptom);
        setSelectedPreset(null);
        setPresetSearch("");
        setPresetEtc("");
        setSelectedParts([]);
        setPartPickerOpen(false);
        setError("");
    };
    // 수리 프리셋 선택 -> 프리셋에 포함된 부품 목록 불러오기
    const handleSelectPreset = async (preset) => {
        setError("");
        if (preset === ETC) {
            setSelectedPreset(ETC);
            setSelectedParts([]);
            return;
        }
        setSelectedPreset(preset.id);
        setSelectedParts([]);
        try {
            const presetParts = await fetchRepairPresetParts(preset.id);
            setSelectedParts(presetParts.map((item) => ({
                part: {
                    id: item.partId,
                    name: item.partName,
                    unitPrice: item.unitPrice,
                    standardMinutes: item.standardMinutes,
                    stockQuantity: item.stockQuantity,
                },
                quantity: Math.max(1, item.quantity),
            })));
        }
        catch (err) {
            setError(err instanceof Error
                ? err.message
                : "수리 프리셋을 불러오지 못했습니다.");
        }
    };
    // 부품 추가
    const handleAddPart = (part) => {
        setSelectedParts((current) => {
            if (current.some((item) => item.part.id === part.id)) {
                return current;
            }
            return [...current, { part, quantity: 1 }];
        });
    };
    // 부품 수량 변경
    const handleQuantity = (partId, delta) => {
        setSelectedParts((current) => current.map((item) => item.part.id === partId
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item));
    };
    // 프리셋 등록
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (selectedSymptom === null) {
            setError("고장 증상을 선택해 주세요.");
            return;
        }
        if (selectedSymptom === ETC && !symptomEtc.trim()) {
            setError("고장 증상을 직접 입력해 주세요.");
            return;
        }
        if (selectedPreset === null) {
            setError("수리 프리셋을 선택해 주세요.");
            return;
        }
        const presetBase = selectedPreset === ETC
            ? null
            : presets.find((preset) => preset.id === selectedPreset);
        const name = selectedPreset === ETC ? presetEtc.trim() : (presetBase?.name ?? "");
        if (!name) {
            setError("작업명을 입력해 주세요.");
            return;
        }
        try {
            setSubmitting(true);
            setError("");
            await onSave({
                name,
                description: presetBase?.description ?? "",
                parts: selectedParts.map((item) => ({
                    partId: item.part.id,
                    quantity: item.quantity,
                })),
                symptomIds: typeof selectedSymptom === "number" ? [selectedSymptom] : [],
            });
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "프리셋 등록에 실패했습니다.");
        }
        finally {
            setSubmitting(false);
        }
    };
    const sectionClass = "flex h-[520px] max-h-[calc(100vh-14rem)] min-h-0 min-w-0 flex-col overflow-hidden border border-neutral-300 p-3";
    const searchClass = "mb-3 w-full rounded border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-blue-500";
    return (_jsxs(Modal, { title: "\uC218\uB9AC \uD504\uB9AC\uC14B \uB4F1\uB85D", wide: true, onClose: onClose, children: [_jsx("p", { className: "mb-3 text-xs text-neutral-400", children: "\uACE0\uC7A5 \uC99D\uC0C1\uC744 \uC120\uD0DD\uD558\uBA74 \uAD00\uB828\uB41C \uC218\uB9AC \uD504\uB9AC\uC14B\uACFC \uBD80\uD488 \uBAA9\uB85D\uC744 \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }), _jsx("form", { onSubmit: handleSubmit, className: "flex gap-3", children: _jsxs("div", { className: "grid min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[0.8fr_1fr_1.8fr]", children: [_jsxs("section", { className: sectionClass, children: [_jsxs("div", { className: "mb-3 flex shrink-0 items-center gap-2", children: [_jsx("h3", { className: "shrink-0 text-sm font-semibold", children: "\uACE0\uC7A5 \uC99D\uC0C1" }), _jsxs("select", { value: category, onChange: (event) => setCategory(event.target.value), className: "min-w-0 flex-1 rounded border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-blue-500", children: [_jsx("option", { value: "", children: "--\uC81C\uD488\uAD70 \uC120\uD0DD--" }), categories.map((item) => (_jsx("option", { value: item, children: item }, item)))] })] }), _jsx("input", { type: "text", value: symptomSearch, onChange: (event) => setSymptomSearch(event.target.value), placeholder: "\uACE0\uC7A5 \uC99D\uC0C1\uC744 \uAC80\uC0C9\uD558\uC138\uC694.", className: `${searchClass} shrink-0` }), _jsx("div", { className: "min-h-0 flex-1 space-y-1 overflow-y-auto", children: filteredSymptoms.length === 0 ? (_jsx("p", { className: "py-8 text-center text-sm text-neutral-400", children: allSymptoms.length === 0
                                            ? "등록된 고장 증상이 없습니다."
                                            : "검색 결과가 없습니다." })) : (filteredSymptoms.map((symptom) => {
                                        const checked = selectedSymptom === symptom.id;
                                        return (_jsxs("label", { className: `flex cursor-pointer items-center gap-2 border p-2 text-sm ${checked
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-transparent hover:bg-neutral-50"}`, children: [_jsx("input", { type: "radio", name: "symptom", checked: checked, onChange: () => handleSelectSymptom(symptom.id), className: "accent-blue-600" }), _jsx("span", { className: "flex-1", children: symptom.name }), _jsx("span", { className: "text-neutral-400", children: ">" })] }, symptom.id));
                                    })) }), _jsxs("label", { className: `mt-2 flex shrink-0 cursor-pointer items-center gap-2 border p-2 text-sm ${selectedSymptom === ETC
                                        ? "border-blue-500 bg-blue-50 text-blue-700"
                                        : "border-neutral-200"}`, children: [_jsx("input", { type: "radio", name: "symptom", checked: selectedSymptom === ETC, onChange: () => handleSelectSymptom(ETC), className: "accent-blue-600" }), _jsx("span", { className: "shrink-0", children: "\uAE30\uD0C0" }), _jsx("input", { type: "text", value: symptomEtc, onChange: (event) => setSymptomEtc(event.target.value), onFocus: () => {
                                                if (selectedSymptom !== ETC)
                                                    handleSelectSymptom(ETC);
                                            }, placeholder: "\uC9C1\uC811\uC785\uB825", className: "min-w-0 flex-1 rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500" }), _jsx("span", { className: "text-neutral-400", children: ">" })] })] }), _jsxs("section", { className: sectionClass, children: [_jsx("h3", { className: "mb-3 shrink-0 text-sm font-semibold", children: "\uC218\uB9AC \uD504\uB9AC\uC14B" }), _jsx("input", { type: "text", value: presetSearch, onChange: (event) => setPresetSearch(event.target.value), placeholder: "\uC218\uB9AC \uD504\uB9AC\uC14B\uC744 \uAC80\uC0C9\uD558\uC138\uC694.", className: `${searchClass} shrink-0` }), _jsx("div", { className: "min-h-0 flex-1 space-y-2 overflow-y-auto", children: selectedSymptom === null ? (_jsx("p", { className: "py-8 text-center text-sm text-neutral-400", children: "\uACE0\uC7A5 \uC99D\uC0C1\uC744 \uBA3C\uC800 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694." })) : presetsLoading ? (_jsx("p", { className: "py-8 text-center text-sm text-neutral-400", children: "\uBD88\uB7EC\uC624\uB294 \uC911..." })) : filteredPresets.length === 0 ? (_jsx("p", { className: "py-8 text-center text-sm text-neutral-400", children: selectedSymptom === ETC
                                            ? "아래 '기타'에서 직접 입력해 주세요."
                                            : "연결된 수리 프리셋이 없습니다." })) : (filteredPresets.map((preset) => {
                                        const checked = selectedPreset === preset.id;
                                        return (_jsxs("label", { className: `flex cursor-pointer items-start gap-2 border p-2 text-sm ${checked
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-neutral-300 hover:border-blue-300"}`, children: [_jsx("input", { type: "radio", name: "preset", checked: checked, onChange: () => handleSelectPreset(preset), className: "mt-1 accent-blue-600" }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block font-medium", children: preset.name }), _jsx("span", { className: "block text-xs text-neutral-400", children: preset.description })] }), _jsx("span", { className: "text-neutral-400", children: ">" })] }, preset.id));
                                    })) }), _jsxs("label", { className: `mt-2 flex shrink-0 cursor-pointer items-start gap-2 border p-2 text-sm ${selectedPreset === ETC
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-neutral-300"}`, children: [_jsx("input", { type: "radio", name: "preset", checked: selectedPreset === ETC, onChange: () => handleSelectPreset(ETC), disabled: selectedSymptom === null, className: "mt-1 accent-blue-600" }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { className: "shrink-0", children: "\uAE30\uD0C0" }), _jsx("input", { type: "text", value: presetEtc, onChange: (event) => setPresetEtc(event.target.value), onFocus: () => {
                                                                if (selectedSymptom !== null && selectedPreset !== ETC) {
                                                                    handleSelectPreset(ETC);
                                                                }
                                                            }, disabled: selectedSymptom === null, placeholder: "\uC9C1\uC811\uC785\uB825", className: "min-w-0 flex-1 rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500 disabled:bg-neutral-100" })] }), _jsx("span", { className: "mt-1 block text-xs text-neutral-400", children: "\uC704 \uD56D\uBAA9\uC5D0 \uD574\uB2F9\uD558\uC9C0 \uC54A\uB294 \uC218\uB9AC" })] })] })] }), _jsxs("section", { className: sectionClass, children: [_jsx("h3", { className: "mb-1 shrink-0 text-sm font-semibold", children: "\uBD80\uD488 \uBAA9\uB85D \uBC0F \uBE44\uC6A9" }), _jsx("p", { className: "mb-4 shrink-0 text-xs text-neutral-400", children: "\uC120\uD0DD\uB41C \uC218\uB9AC \uD504\uB9AC\uC14B\uC5D0 \uD3EC\uD568\uB41C \uBD80\uD488 \uBAA9\uB85D\uACFC \uC608\uC0C1 \uBE44\uC6A9\uC785\uB2C8\uB2E4." }), selectedParts.length > 0 ? (_jsx("div", { className: "min-h-0 flex-1 overflow-auto", children: _jsxs("table", { className: "w-full min-w-[480px] text-sm", children: [_jsx("thead", { className: "text-xs text-neutral-500", children: _jsxs("tr", { children: [_jsx("th", { className: "py-2 text-left font-normal", children: "\uBD80\uD488\uBA85" }), _jsx("th", { className: "text-center font-normal", children: "\uC218\uB7C9" }), _jsx("th", { className: "text-center font-normal", children: "\uC7AC\uACE0" }), _jsx("th", { className: "text-center font-normal", children: "\uB2E8\uC704 \uC2DC\uAC04" }), _jsx("th", { className: "text-right font-normal", children: "\uB2E8\uAC00" }), _jsx("th", { className: "text-right font-normal", children: "\uAE08\uC561" })] }) }), _jsx("tbody", { children: selectedParts.map(({ part, quantity }) => {
                                                    const unitPrice = safeNumber(part.unitPrice);
                                                    return (_jsxs("tr", { className: "border border-neutral-300", children: [_jsx("td", { className: "px-2 py-3 font-medium", children: part.name }), _jsx("td", { children: _jsxs("div", { className: "flex items-center justify-center gap-1", children: [_jsx("button", { type: "button", onClick: () => handleQuantity(part.id, -1), className: "h-6 w-6 rounded border border-neutral-300", children: "-" }), _jsx("span", { className: "min-w-5 text-center", children: quantity }), _jsx("button", { type: "button", onClick: () => handleQuantity(part.id, 1), className: "h-6 w-6 rounded bg-blue-600 text-white", children: "+" })] }) }), _jsx("td", { className: "text-center", children: safeNumber(part.stockQuantity) }), _jsxs("td", { className: "text-center", children: [safeNumber(part.standardMinutes), "\uBD84"] }), _jsx("td", { className: "text-right", children: won(unitPrice) }), _jsx("td", { className: "px-2 text-right font-medium", children: won(unitPrice * quantity) })] }, part.id));
                                                }) })] }) })) : (_jsx("div", { className: "flex min-h-0 flex-1 items-center justify-center border border-dashed border-neutral-300 text-sm text-neutral-400", children: "\uBD80\uD488\uC774 \uC120\uD0DD\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4." })), _jsx("button", { type: "button", onClick: () => setPartPickerOpen(true), className: "mt-2 w-full shrink-0 border border-neutral-300 py-3 text-sm hover:bg-neutral-50", children: "+ \uBD80\uD488 \uCD94\uAC00" }), _jsxs("div", { className: "mt-auto shrink-0 space-y-3 pt-4", children: [error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { type: "button", variant: "ghost", onClick: onClose, disabled: submitting, children: "\uCDE8\uC18C" }), _jsx(Button, { type: "submit", disabled: submitting, children: submitting ? "등록 중..." : "프리셋으로 등록" })] })] })] })] }) }), partPickerOpen && (_jsx(PartPickerModal, { selectedIds: selectedParts.map((item) => item.part.id), onAdd: handleAddPart, onClose: () => setPartPickerOpen(false) }))] }));
}
