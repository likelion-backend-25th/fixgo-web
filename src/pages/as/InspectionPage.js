import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { SelectBox, TextArea, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import { categoryLabel, fetchProduct, startMyInspection } from "@/lib/asReceptionApi";
import { calculateRepairCost, confirmRepairCost, createRepairPartUsage, createRepairWork, abortRepair, fetchRepairPresetParts, fetchRepairPresets, fetchRepairPresetsBySymptom, fetchRepairWorks, fetchSymptomPresets, updateRepair, } from "@/lib/repair";
import { formatYearMonthDay, won } from "@/lib/format";
import { assessWarranty } from "@/lib/warranty";
import { ReceptionProgress } from "@/pages/as/ReceptionProgress";
import { AsSummary } from "@/pages/as/AsSummary";
import { PresetPickerModal } from "@/pages/as/PresetPickerModal";
import { ProgressTabs } from "@/pages/as/ProgressTabs";
import { useSessionStore } from "@/stores/useSessionStore";
export function InspectionPage() {
    const isTechnician = useSessionStore((state) => state.user?.role === "TECHNICIAN");
    if (!isTechnician)
        return _jsx(Notice, { children: "\uC810\uAC80\uC740 \uB2F4\uB2F9 \uAE30\uC0AC\uAC00 \uC9C4\uD589\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." });
    return (_jsx(ReceptionProgress, { render: ({ reception, repair }, reload) => (repair === null
            ? _jsx(InspectionStart, { record: reception, onStarted: reload })
            : isInspectionAborted(repair, reception)
                ? _jsx(InspectionFinished, { record: reception })
                : _jsx(InspectionForm, { record: reception, repair: repair, onCompleted: reload }, repair.id)) }));
}
function InspectionStart({ record, onStarted }) {
    const [starting, setStarting] = useState(false);
    const [error, setError] = useState("");
    async function start() {
        setStarting(true);
        setError("");
        try {
            await startMyInspection(record.id);
            // 생성 성공 후 상세를 다시 읽어 서버에 저장된 기록으로 화면을 전환한다.
            onStarted();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "점검을 시작하지 못했습니다.");
            setStarting(false);
        }
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(AsSummary, { record: record }), _jsx(ProgressTabs, { receptionId: record.id, current: "inspection" }), error !== "" && _jsx(Notice, { tone: "error", children: error }), record.status === "RECEIVED" ? (_jsx(Button, { disabled: starting, onClick: () => void start(), children: starting ? "점검 시작 중…" : "점검 시작" })) : _jsx(Notice, { children: "\uC870\uD68C\uD560 \uC218 \uC788\uB294 \uC810\uAC80 \uAE30\uB85D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })] }));
}
function InspectionFinished({ record }) {
    const navigate = useNavigate();
    const waiting = record.returnMethod === "PICKUP" ? "수령 대기" : "배송 대기";
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(AsSummary, { record: record }), _jsxs(Notice, { children: ["A/S\uB97C \uC911\uB2E8\uD588\uC2B5\uB2C8\uB2E4. ", waiting, "\uB85C \uB118\uC5B4\uAC00 \uC810\uAC80\uC774 \uB05D\uB0AC\uC2B5\uB2C8\uB2E4."] }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { onClick: () => navigate("/as/list"), children: "\uBAA9\uB85D\uC73C\uB85C" }) })] }));
}
function isInspectionAborted(repair, record) {
    return repair.status === "REJECTED"
        && (record.status === "AWAITING_SHIPMENT" || record.status === "AWAITING_PICKUP");
}
// 점검 항목은 고장 증상, 수리 프리셋, 소모 부품 순서로 쌓인다.
function InspectionForm({ record, repair, onCompleted, }) {
    const [lines, setLines] = useState([]);
    const [savedLoading, setSavedLoading] = useState(true);
    const [note, setNote] = useState(repair.diagnosis ?? "");
    const [coverageLoad, setCoverageLoad] = useState({ status: "loading" });
    const [customerFault, setCustomerFault] = useState(false);
    const [reason, setReason] = useState(repair.reason ?? "");
    const [rejectCategory, setRejectCategory] = useState("");
    const [rejectReason, setRejectReason] = useState("");
    const [abortOpen, setAbortOpen] = useState(false);
    const [abortNotice, setAbortNotice] = useState("");
    const [presetOpen, setPresetOpen] = useState(false);
    const [notice, setNotice] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();
    const diagnosing = repair.status === "DIAGNOSING";
    // 1차 보증 판정은 구매일과 모델 보증기간으로 계산한다.
    useEffect(() => {
        const controller = new AbortController();
        fetchProduct(record.product.id, controller.signal)
            .then((product) => {
            if (controller.signal.aborted) {
                return;
            }
            const coverage = assessWarranty(product.purchasedAt, product.warrantyMonths);
            setCoverageLoad({ status: "ready", coverage });
            setCustomerFault(coverage?.covered === true && repair.warrantyResult === "PAID");
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause)) {
                return;
            }
            setCoverageLoad({ status: "error" });
        });
        return () => controller.abort();
    }, [record.product.id, repair.warrantyResult]);
    // 완료 후 새로고침해도 서버에 남은 작업과 부품을 다시 표에 그린다.
    useEffect(() => {
        const controller = new AbortController();
        async function loadSavedLines() {
            try {
                const works = await fetchRepairWorks(repair.id, controller.signal);
                if (works.length === 0) {
                    if (!controller.signal.aborted)
                        setLines([]);
                    return;
                }
                const [presets, product, symptoms] = await Promise.all([
                    fetchRepairPresets(controller.signal),
                    fetchProduct(record.product.id, controller.signal),
                    fetchSymptomPresets(controller.signal),
                ]);
                const category = categoryLabel(product.category);
                const relations = await Promise.all(symptoms
                    .filter((symptom) => symptom.productCategory === category)
                    .map(async (symptom) => ({
                    id: symptom.id,
                    name: symptom.name,
                    presets: await fetchRepairPresetsBySymptom(symptom.id, controller.signal),
                })));
                const presetByName = new Map(presets.map((preset) => [preset.name, preset]));
                const symptomsByPresetId = new Map();
                for (const relation of relations) {
                    for (const preset of relation.presets) {
                        const linked = symptomsByPresetId.get(preset.id) ?? [];
                        linked.push({ id: relation.id, name: relation.name });
                        symptomsByPresetId.set(preset.id, linked);
                    }
                }
                const partsByPresetId = new Map();
                await Promise.all(works.map(async (work) => {
                    const presetName = work.repairPresetName?.trim() ?? "";
                    const preset = presetByName.get(presetName);
                    if (preset === undefined || partsByPresetId.has(preset.id))
                        return;
                    const parts = await fetchRepairPresetParts(preset.id, controller.signal);
                    partsByPresetId.set(preset.id, parts);
                }));
                if (controller.signal.aborted)
                    return;
                setLines(linesFromSavedWorks(works, presetByName, symptomsByPresetId, partsByPresetId));
            }
            catch (cause) {
                if (controller.signal.aborted || isAbortError(cause))
                    return;
                setNotice(cause instanceof Error ? cause.message : "저장된 점검 항목을 불러오지 못했습니다.");
            }
            finally {
                if (!controller.signal.aborted)
                    setSavedLoading(false);
            }
        }
        void loadSavedLines();
        return () => controller.abort();
    }, [record.id, repair.id]);
    const laborTotal = useMemo(() => lines.reduce((sum, line) => sum + line.amount, 0), [lines]);
    const coverage = coverageLoad.status === "ready" ? coverageLoad.coverage : null;
    const autoJudgment = coverage === null ? null : coverage.covered ? "무상" : "유상";
    const savedJudgment = repair.warrantyResult === "FREE" ? "무상" : repair.warrantyResult === "PAID" ? "유상" : null;
    const judgment = diagnosing
        ? (autoJudgment === "무상" && customerFault ? "유상" : autoJudgment)
        : savedJudgment;
    const charge = judgment === "무상" ? 0 : laborTotal;
    const warranty = judgment === "무상" ? laborTotal : 0;
    async function complete() {
        if (note.trim() === "") {
            setNotice("점검 내용을 입력해 주세요.");
            return;
        }
        if (judgment === null) {
            setNotice("구매일 또는 보증기간을 확인할 수 없어 판정할 수 없습니다.");
            return;
        }
        if (customerFault && reason.trim() === "") {
            setNotice("고객 과실로 유상 처리할 사유를 입력해 주세요.");
            return;
        }
        const technicianId = record.technician?.id;
        if (technicianId === undefined) {
            setNotice("담당 기사를 확인할 수 없습니다.");
            return;
        }
        setSubmitting(true);
        setNotice("");
        try {
            // 1. 점검 내용과 최종 보증 판정 저장
            await updateRepair(repair.id, {
                asReceptionId: record.id,
                technicianId,
                diagnosis: note.trim(),
                workNote: "",
                repairDecision: "REPAIRABLE",
                warrantyResult: judgment === "무상" ? "FREE" : "PAID",
                reason: reason.trim(),
                laborRate: 0,
                inspectionCost: 0,
                finalAmount: 0,
                status: "DIAGNOSING",
                reasonForRejection: "",
            });
            // 2. 증상별로 고른 수리 프리셋을 작업으로 등록하고, 그 프리셋의 부품 사용도 함께 남긴다.
            for (const line of lines) {
                if (line.kind !== "작업" || line.presetId === undefined) {
                    continue;
                }
                const symptom = lines.find((item) => item.kind === "증상" && item.symptomId === line.symptomId);
                const work = await createRepairWork({
                    repairId: repair.id,
                    presetId: line.presetId,
                    workName: symptom?.name ?? line.name,
                });
                const parts = lines
                    .filter(isConsumedPart)
                    .filter((item) => item.groupId === line.groupId);
                for (const part of parts) {
                    await createRepairPartUsage({
                        repairWorkId: work.id,
                        partId: part.partId,
                        quantity: part.quantity ?? 1,
                    });
                }
            }
            // 3. 백엔드에서 수리 비용 계산
            // 무상(FREE): 부품비, 공임비, 최종 금액 모두 0원
            // 유상(PAID): 등록된 작업 및 부품을 기준으로 비용 계산
            await calculateRepairCost(repair.id);
            // 4. 수리 비용 확정
            // 무상(FREE): APPROVED로 바로 전환
            // 유상(PAID): REQUESTED로 전환하여 고객 견적 승인 대기
            await confirmRepairCost(repair.id);
            // 5. 최신 서버 데이터로 화면 갱신
            onCompleted();
        }
        catch (cause) {
            setNotice(cause instanceof Error
                ? cause.message
                : "점검을 완료하지 못했습니다.");
            setSubmitting(false);
        }
    }
    const returnWaitingLabel = record.returnMethod === "PICKUP" ? "수령 대기" : "배송 대기";
    function closeAbort() {
        setAbortOpen(false);
        setAbortNotice("");
        setRejectCategory("");
        setRejectReason("");
    }
    async function abort() {
        if (!isAbortCategory(rejectCategory) || rejectReason.trim() === "") {
            setAbortNotice("중단 카테고리와 사유를 입력해 주세요.");
            return;
        }
        setSubmitting(true);
        setAbortNotice("");
        try {
            await abortRepair(repair.id, {
                category: rejectCategory,
                reason: rejectReason.trim(),
            });
            // 반환 대기로 넘긴 뒤에는 점검 화면을 닫고 목록으로 돌아간다.
            navigate("/as/list", {
                state: { notice: `A/S를 중단했습니다. ${returnWaitingLabel}로 넘어가 점검이 끝났습니다.` },
            });
        }
        catch (cause) {
            setAbortNotice(cause instanceof Error ? cause.message : "A/S를 중단하지 못했습니다.");
            setSubmitting(false);
        }
    }
    return (_jsxs("div", { className: "space-y-4", children: [notice !== "" && _jsx(Notice, { children: notice }), _jsx(AsSummary, { record: record }), _jsx(ProgressTabs, { receptionId: record.id, current: "inspection" }), diagnosing ? (_jsx(Notice, { children: "\uC720\uC0C1\uC73C\uB85C \uC800\uC7A5\uD558\uBA74 \uACAC\uC801 \uC2B9\uC778 \uB300\uAE30\uAC00 \uB429\uB2C8\uB2E4. \uBB34\uC0C1\uC740 0\uC6D0\uC73C\uB85C \uD655\uC815\uB418\uACE0 \uACE0\uAC1D \uC2B9\uC778 \uC5C6\uC774 \uC218\uB9AC \uB300\uAE30\uB85C \uB118\uC5B4\uAC11\uB2C8\uB2E4." })) : (_jsx(Notice, { children: inspectionResultMessage(repair, record) })), _jsxs("section", { children: [_jsxs("div", { className: "mb-2 flex items-center justify-between", children: [_jsx("p", { className: "text-sm font-medium", children: "\uC810\uAC80 \uD56D\uBAA9" }), diagnosing && (_jsx(Button, { variant: "outline", onClick: () => setPresetOpen(true), children: "\uC218\uB9AC \uD504\uB9AC\uC14B" }))] }), _jsx(LineTable, { lines: lines, loading: savedLoading, editable: diagnosing, onRemoveGroup: (groupId) => setLines((current) => withoutPresetGroup(current, groupId)) }), _jsxs("p", { className: "mt-2 text-right text-sm", children: ["\uACAC\uC801 \uD569\uACC4 ", _jsx("span", { className: "ml-6 font-semibold text-blue-700", children: won(laborTotal) })] })] }), _jsx(TextArea, { label: "\uC810\uAC80 \uB0B4\uC6A9", value: note, onChange: setNote, readOnly: !diagnosing }), _jsx(WarrantySection, { load: coverageLoad, autoJudgment: autoJudgment, judgment: judgment, customerFault: customerFault, diagnosing: diagnosing, onCustomerFault: setCustomerFault }), _jsx(TextArea, { className: "text-sm", label: "\uD310\uC815 \uC0AC\uC720", value: reason, onChange: setReason, readOnly: !diagnosing }), diagnosing && abortOpen && (_jsx(Modal, { title: "A/S \uC911\uB2E8", compact: true, onClose: closeAbort, children: _jsxs("div", { className: "space-y-3", children: [abortNotice !== "" && _jsx(Notice, { children: abortNotice }), _jsxs("p", { className: "text-sm text-neutral-500", children: ["\uBD80\uD488 \uB2E8\uC885\uCC98\uB7FC \uC218\uB9AC\uAC00 \uBD88\uAC00\uB2A5\uD558\uAC70\uB098 \uACE0\uAC1D\uC774 \uCDE8\uC18C\uD55C \uACBD\uC6B0\uC785\uB2C8\uB2E4. \uC81C\uCD9C\uD558\uBA74 ", returnWaitingLabel, "\uB85C \uB118\uC5B4\uAC11\uB2C8\uB2E4."] }), _jsxs("label", { className: "block text-sm", children: [_jsx("span", { className: "mb-1.5 block text-xs font-medium text-neutral-600", children: "\uCE74\uD14C\uACE0\uB9AC" }), _jsx(SelectBox, { "aria-label": "\uC911\uB2E8 \uCE74\uD14C\uACE0\uB9AC", value: rejectCategory, onChange: setRejectCategory, className: "w-full", options: [
                                        { value: "", label: "--카테고리 선택--" },
                                        { value: "REPAIR_IMPOSSIBLE", label: "수리 불가" },
                                        { value: "CUSTOMER_CANCEL", label: "고객 취소" },
                                    ] })] }), _jsx(TextField, { label: "\uC0AC\uC720", value: rejectReason, onChange: setRejectReason, placeholder: "\uC0AC\uC720 \uC785\uB825" }), _jsxs("div", { className: "flex justify-end gap-2 pt-1", children: [_jsx(Button, { variant: "ghost", disabled: submitting, onClick: closeAbort, children: "\uCDE8\uC18C" }), _jsx(Button, { disabled: submitting, onClick: () => void abort(), children: submitting ? "제출 중…" : "제출" })] })] }) })), _jsxs("div", { className: "rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { children: "\uD56D\uBAA9 \uD569\uACC4" }), _jsx("span", { children: won(laborTotal) })] }), _jsxs("div", { className: "flex justify-between text-blue-700", children: [_jsx("span", { children: "\uBCF4\uC99D \uBB34\uC0C1" }), _jsxs("span", { children: ["-", won(warranty)] })] }), _jsxs("div", { className: "mt-2 flex justify-between border-t border-blue-200 pt-2 font-semibold", children: [_jsx("span", { children: "\uCCAD\uAD6C \uAE08\uC561" }), _jsx("span", { children: judgment === null ? "미판정" : won(charge) })] })] }), diagnosing && (_jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "outline", disabled: submitting, onClick: () => setAbortOpen(true), children: "A/S \uC911\uB2E8" }), _jsx(Button, { disabled: submitting || judgment === null, onClick: () => void complete(), children: submitting ? "점검 완료 처리 중…" : "점검 완료" })] })), presetOpen && (_jsx(PresetPickerModal, { productId: record.product.id, onClose: () => setPresetOpen(false), onApply: async (selection) => {
                    setLines((current) => appendSymptomPresets(current, selection));
                    setNotice("같은 고장 증상에 수리 프리셋을 추가했습니다.");
                } }))] }));
}
function WarrantySection({ load, autoJudgment, judgment, customerFault, diagnosing, onCustomerFault, }) {
    const coverage = load.status === "ready" ? load.coverage : null;
    return (_jsxs("section", { className: "rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm", children: [_jsx("p", { className: "mb-3 font-medium", children: "\uBCF4\uC99D \uD310\uC815" }), load.status === "loading" && _jsx("p", { children: "\uBCF4\uC99D \uAE30\uAC04\uC744 \uD655\uC778\uD558\uB294 \uC911\uC785\uB2C8\uB2E4." }), load.status === "error" && _jsx("p", { children: "\uBCF4\uC99D \uAE30\uAC04\uC744 \uD655\uC778\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4." }), load.status === "ready" && coverage === null && (_jsx("p", { children: "\uAD6C\uB9E4\uC77C \uB610\uB294 \uBAA8\uB378\uC758 \uBCF4\uC99D\uAE30\uAC04\uC774 \uC5C6\uC5B4 \uC790\uB3D9\uC73C\uB85C \uD310\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." })), coverage !== null && (_jsxs("div", { className: "grid gap-3 sm:grid-cols-2", children: [_jsxs("p", { children: ["\uAD6C\uB9E4\uC77C ", formatYearMonthDay(coverage.purchasedAt)] }), _jsxs("p", { children: ["\uBCF4\uC99D\uAE30\uAC04 ", coverage.warrantyMonths, "\uAC1C\uC6D4"] }), _jsxs("p", { children: ["\uB9CC\uB8CC\uC77C ", formatYearMonthDay(coverage.expiresOn)] }), _jsxs("p", { children: ["1\uCC28 \uD310\uC815 ", autoJudgment === "무상" ? "보증 기간 안, 무상" : "보증 기간 만료, 유상"] })] })), _jsxs("div", { className: "mt-4 border-t border-neutral-200 pt-4", children: [_jsxs("p", { className: "font-medium", children: ["\uCD5C\uC885 \uD310\uC815 ", judgment ?? "확인 중"] }), autoJudgment === "무상" && (_jsxs("label", { className: "mt-3 flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: customerFault, disabled: !diagnosing, onChange: (event) => onCustomerFault(event.target.checked) }), "\uACE0\uAC1D \uACFC\uC2E4\uB85C \uC720\uC0C1 \uBCC0\uACBD"] })), autoJudgment === "유상" && (_jsx("p", { className: "mt-2 text-neutral-500", children: "\uBCF4\uC99D \uAE30\uAC04\uC774 \uC9C0\uB098 \uC720\uC0C1\uC785\uB2C8\uB2E4." }))] })] }));
}
function inspectionResultMessage(repair, record) {
    if (repair.status === "REQUESTED") {
        return "견적 승인 대기입니다. 고객이 승인하면 수리 페이지에서 수리를 시작할 수 있습니다.";
    }
    if (repair.status === "APPROVED" && repair.warrantyResult === "FREE") {
        return "무상 수리로 확정되었습니다. 수리 페이지에서 수리를 시작합니다.";
    }
    if (repair.status === "APPROVED" || repair.status === "REPAIRING" || repair.status === "COMPLETED") {
        return "고객이 견적을 승인했습니다. 수리 페이지에서 진행합니다.";
    }
    if (repair.status === "REJECTED") {
        if (record.status === "AWAITING_SHIPMENT" || record.status === "AWAITING_PICKUP") {
            const waiting = record.returnMethod === "PICKUP" ? "수령 대기" : "배송 대기";
            return `A/S를 중단했습니다. ${waiting}로 넘어갔습니다.`;
        }
        return "고객이 견적을 거부했습니다. 점검비 결제 후 배송 또는 수령으로 넘어갑니다.";
    }
    return "점검이 완료된 건입니다.";
}
function isAbortCategory(value) {
    return value === "REPAIR_IMPOSSIBLE" || value === "CUSTOMER_CANCEL";
}
function isConsumedPart(line) {
    return line.kind === "부품" && typeof line.partId === "number";
}
function presetLines(symptomId, choice) {
    const groupId = `group-${symptomId}-${choice.preset.id}-${Date.now()}`;
    const presetLine = {
        id: `${groupId}-preset`,
        groupId,
        symptomId,
        kind: "작업",
        name: choice.preset.name,
        quantityLabel: `${choice.preset.estimatedMinutes}분`,
        unitPriceLabel: "-",
        amount: 0,
        presetId: choice.preset.id,
    };
    const partLines = choice.parts.map((part) => ({
        id: `${groupId}-part-${part.partId}`,
        groupId,
        symptomId,
        kind: "부품",
        name: part.partName,
        quantityLabel: `${part.quantity}개`,
        unitPriceLabel: won(part.unitPrice),
        amount: part.unitPrice * part.quantity,
        indent: true,
        partId: part.partId,
        quantity: part.quantity,
    }));
    return [presetLine, ...partLines];
}
function appendSymptomPresets(current, selection) {
    const takenPresetIds = new Set(current
        .filter((line) => line.kind === "작업" && line.symptomId === selection.symptom.id && line.presetId !== undefined)
        .map((line) => line.presetId));
    const fresh = selection.presets.filter((choice) => !takenPresetIds.has(choice.preset.id));
    if (fresh.length === 0)
        return current;
    const presetRows = fresh.flatMap((choice) => presetLines(selection.symptom.id, choice));
    const symptomIndex = current.findIndex((line) => line.kind === "증상" && line.symptomId === selection.symptom.id);
    if (symptomIndex === -1) {
        const symptomLine = {
            id: `symptom-${selection.symptom.id}`,
            symptomId: selection.symptom.id,
            kind: "증상",
            name: selection.symptom.name,
            quantityLabel: "-",
            unitPriceLabel: "-",
            amount: 0,
        };
        return [...current, symptomLine, ...presetRows];
    }
    let end = symptomIndex + 1;
    while (end < current.length && current[end]?.kind !== "증상")
        end += 1;
    return [...current.slice(0, end), ...presetRows, ...current.slice(end)];
}
function withoutPresetGroup(lines, groupId) {
    const next = lines.filter((line) => line.groupId !== groupId);
    return next.filter((line, index) => {
        if (line.kind !== "증상")
            return true;
        const following = next.slice(index + 1);
        const nextSymptom = following.findIndex((item) => item.kind === "증상");
        const block = nextSymptom === -1 ? following : following.slice(0, nextSymptom);
        return block.some((item) => item.kind === "작업");
    });
}
function linesFromSavedWorks(works, presetByName, symptomsByPresetId, partsByPresetId) {
    const rows = [];
    for (const work of works) {
        const groupId = `saved-${work.id}`;
        const presetName = work.repairPresetName?.trim() || work.workName;
        const preset = presetByName.get(presetName);
        const storedSymptom = work.workName.trim();
        const linkedSymptoms = preset === undefined ? [] : symptomsByPresetId.get(preset.id) ?? [];
        const symptom = storedSymptom !== "" && storedSymptom !== presetName
            ? linkedSymptoms.find((item) => item.name === storedSymptom) ?? { id: 0, name: storedSymptom }
            : linkedSymptoms.length === 1 ? linkedSymptoms[0] : undefined;
        const parts = preset === undefined ? [] : partsByPresetId.get(preset.id) ?? [];
        const block = [{
                id: `${groupId}-preset`,
                groupId,
                symptomId: symptom !== undefined && symptom.id !== 0 ? symptom.id : undefined,
                kind: "작업",
                name: presetName,
                quantityLabel: preset === undefined ? "-" : `${preset.estimatedMinutes}분`,
                unitPriceLabel: "-",
                amount: 0,
                presetId: preset?.id,
            }];
        for (const part of parts) {
            block.push({
                id: `${groupId}-part-${part.partId}`,
                groupId,
                symptomId: symptom !== undefined && symptom.id !== 0 ? symptom.id : undefined,
                kind: "부품",
                name: part.partName,
                quantityLabel: `${part.quantity}개`,
                unitPriceLabel: won(part.unitPrice),
                amount: part.unitPrice * part.quantity,
                indent: true,
            });
        }
        if (symptom === undefined) {
            rows.push(...block);
            continue;
        }
        const symptomIndex = rows.findIndex((line) => line.kind === "증상" && line.name === symptom.name);
        if (symptomIndex === -1) {
            rows.push({
                id: symptom.id === 0 ? `${groupId}-symptom` : `symptom-${symptom.id}`,
                symptomId: symptom.id === 0 ? undefined : symptom.id,
                kind: "증상",
                name: symptom.name,
                quantityLabel: "-",
                unitPriceLabel: "-",
                amount: 0,
            }, ...block);
            continue;
        }
        let end = symptomIndex + 1;
        while (end < rows.length && rows[end]?.kind !== "증상")
            end += 1;
        rows.splice(end, 0, ...block);
    }
    return rows;
}
function inspectionBoundaryClass(kind, previous) {
    if (kind === "증상") {
        return previous === undefined
            ? "bg-neutral-100"
            : "border-t-4 border-neutral-500 bg-neutral-100";
    }
    if (kind === "부품") {
        return "border-t border-neutral-100";
    }
    return "border-t border-neutral-200";
}
function LineTable({ lines, loading, editable, onRemoveGroup, }) {
    return (_jsx("div", { className: "overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm", children: _jsxs("table", { className: "w-full min-w-[640px] text-sm", children: [_jsx("thead", { className: "bg-neutral-50 text-left text-xs text-neutral-500", children: _jsx("tr", { children: ["구분", "항목", "시간/수량", "단가", "금액", ""].map((header) => (_jsx("th", { className: "px-3 py-2 font-medium", children: header }, header))) }) }), _jsx("tbody", { children: loading ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-3 py-8 text-center text-neutral-500", children: "\uC800\uC7A5\uB41C \uC810\uAC80 \uD56D\uBAA9\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." }) })) : lines.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "px-3 py-8 text-center text-neutral-500", children: editable
                                ? "고장 증상, 수리 프리셋, 소모 부품 순서로 점검 항목을 추가해 주세요."
                                : "저장된 점검 항목이 없습니다." }) })) : lines.map((line, index) => {
                        const groupId = line.groupId;
                        const boundary = inspectionBoundaryClass(line.kind, lines[index - 1]);
                        const leadClass = line.kind === "부품" ? `py-2 pr-3 pl-8 ${boundary}` : `px-3 py-2 ${boundary}`;
                        const cellClass = `px-3 py-2 ${boundary}`;
                        return (_jsxs("tr", { children: [_jsx("td", { className: leadClass, children: line.kind === "작업" ? "프리셋" : line.kind }), _jsx("td", { className: leadClass, children: line.name }), _jsx("td", { className: cellClass, children: line.quantityLabel }), _jsx("td", { className: cellClass, children: line.unitPriceLabel }), _jsx("td", { className: cellClass, children: line.amount === 0 ? "-" : line.amount.toLocaleString("ko-KR") }), _jsx("td", { className: `${cellClass} text-right`, children: editable && line.kind === "작업" && groupId !== undefined && (_jsx("button", { type: "button", className: "text-neutral-500", onClick: () => onRemoveGroup(groupId), children: "X" })) })] }, line.id));
                    }) })] }) }));
}
