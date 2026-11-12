import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Notice, Panel } from "@/components/ui/Panel";
import { updateReception } from "@/lib/asReceptionApi";
import { useSessionStore } from "@/stores/useSessionStore";
const editableStatuses = [
    "RECEIVED",
    "INSPECTION",
    "WARRANTY_REVIEW",
    "AWAITING_QUOTE_APPROVAL",
    "AWAITING_REPAIR",
];
export function ReceptionEditPanel({ detail, onSaved }) {
    const role = useSessionStore((state) => state.user?.role);
    const memberId = useSessionStore((state) => state.memberId);
    const canEdit = role === "ADMIN" || role === "RECEPTIONIST";
    // 직원 번호가 없으면 화면에서 소유자를 가리지 않고, 저장 시 서버가 권한을 판단한다.
    const ownsReception = role === "ADMIN" || memberId === null || detail.receptionist?.id === memberId;
    const statusOpen = editableStatuses.includes(detail.status);
    const [symptom, setSymptom] = useState(detail.symptom);
    const [symptomDetail, setSymptomDetail] = useState(detail.symptomDetail);
    const [memo, setMemo] = useState(detail.memo ?? "");
    const [returnMethod, setReturnMethod] = useState(detail.returnMethod);
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    useEffect(() => {
        setSymptom(detail.symptom);
        setSymptomDetail(detail.symptomDetail);
        setMemo(detail.memo ?? "");
        setReturnMethod(detail.returnMethod);
    }, [detail]);
    if (!canEdit) {
        return null;
    }
    async function save() {
        if (symptom.trim() === "" || symptomDetail.trim() === "") {
            setError("고장 증상 요약과 상세를 입력해 주세요.");
            return;
        }
        if (symptom.trim().length > 255 || symptomDetail.trim().length > 255) {
            setError("고장 증상 요약과 상세는 255자까지 입력할 수 있습니다.");
            return;
        }
        if (memo.trim().length > 1000) {
            setError("메모는 1000자까지 입력할 수 있습니다.");
            return;
        }
        setPending(true);
        setError("");
        try {
            await updateReception(detail.id, { symptom, symptomDetail, memo, returnMethod });
            onSaved("접수 정보를 수정했습니다.");
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "접수 정보를 수정하지 못했습니다.");
        }
        finally {
            setPending(false);
        }
    }
    return (_jsxs(Panel, { title: "\uC811\uC218 \uC218\uC815", action: statusOpen && ownsReception ? _jsx(Button, { onClick: () => void save(), disabled: pending, children: "\uC218\uC815" }) : undefined, children: [error !== "" && _jsx(Notice, { tone: "error", children: error }), !statusOpen && _jsx("p", { className: "text-sm text-neutral-500", children: "\uC218\uB9AC \uC2DC\uC791 \uC804 \uC811\uC218\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }), statusOpen && !ownsReception && _jsx("p", { className: "text-sm text-neutral-500", children: "\uD574\uB2F9 \uAC74\uC744 \uB4F1\uB85D\uD55C \uC811\uC218 \uB2F4\uB2F9\uC790\uB9CC \uC218\uC815\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }), statusOpen && ownsReception && (_jsxs("div", { className: "grid items-end gap-3 md:grid-cols-2", children: [_jsx(TextField, { label: "\uACE0\uC7A5 \uC99D\uC0C1 \uC694\uC57D", value: symptom, onChange: setSymptom }), _jsxs("div", { className: "flex h-10 items-center justify-center gap-6 text-sm", children: [_jsx("span", { className: "font-medium text-neutral-600", children: "\uC218\uB839 \uBC29\uC2DD" }), ["방문", "택배"].map((label) => {
                                const method = label === "방문" ? "PICKUP" : "DELIVERY";
                                return (_jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "radio", name: "edit-return-method", checked: returnMethod === method, onChange: () => setReturnMethod(method) }), label] }, method));
                            })] }), _jsx(TextArea, { label: "\uACE0\uC7A5 \uC99D\uC0C1 \uC0C1\uC138", value: symptomDetail, onChange: setSymptomDetail, rows: 4 }), _jsx(TextArea, { label: "\uACE0\uAC1D \uC694\uCCAD \uC0AC\uD56D / \uBA54\uBAA8", value: memo, onChange: setMemo, rows: 4 })] }))] }));
}
