import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice, Panel } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import { fetchAssignableTechnicians, fetchTechnicianHistory, reassignTechnician } from "@/lib/asReceptionApi";
import { formatDateTime, formatDurationMinutes } from "@/lib/format";
import { useSessionStore } from "@/stores/useSessionStore";
const closedStatuses = [
    "AWAITING_PAYMENT",
    "AWAITING_SHIPMENT",
    "AWAITING_PICKUP",
    "COMPLETED",
];
export function TechnicianAssignPanel({ detail, refreshKey, onReassigned }) {
    const role = useSessionStore((state) => state.user?.role);
    const canAssign = role === "ADMIN" || role === "RECEPTIONIST";
    const locked = closedStatuses.includes(detail.status);
    const [technicians, setTechnicians] = useState([]);
    const [history, setHistory] = useState([]);
    const [technicianId, setTechnicianId] = useState("");
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [pending, setPending] = useState(false);
    useEffect(() => {
        if (!canAssign) {
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        setError("");
        // 재배정 가능 여부와 관계없이 이력은 항상 보여 준다.
        Promise.all([
            fetchAssignableTechnicians("", "INSPECTION_WAITING_COUNT", "ASC", controller.signal),
            fetchTechnicianHistory(detail.id, controller.signal),
        ])
            .then(([nextTechnicians, nextHistory]) => {
            if (controller.signal.aborted) {
                return;
            }
            setTechnicians(nextTechnicians);
            setHistory(nextHistory);
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause)) {
                return;
            }
            setTechnicians([]);
            setHistory([]);
            setError(cause instanceof Error ? cause.message : "기사 배정 정보를 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [canAssign, detail.id, refreshKey]);
    if (!canAssign) {
        return null;
    }
    async function save() {
        const nextId = Number(technicianId);
        if (!Number.isInteger(nextId) || nextId <= 0) {
            setError("새로 배정할 기사를 선택해 주세요.");
            return;
        }
        if (detail.technician?.id === nextId) {
            setError("현재 담당 기사와 다른 기사를 선택해 주세요.");
            return;
        }
        if (reason.trim() === "") {
            setError("재배정 사유를 입력해 주세요.");
            return;
        }
        setPending(true);
        setError("");
        try {
            await reassignTechnician(detail.id, nextId, reason);
            const selected = technicians.find((item) => item.id === nextId);
            setTechnicianId("");
            setReason("");
            onReassigned(`${selected?.name ?? "기사"} 님으로 다시 배정했습니다.`);
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "기사를 다시 배정하지 못했습니다.");
        }
        finally {
            setPending(false);
        }
    }
    return (_jsxs(Panel, { title: "\uB2F4\uB2F9 \uAE30\uC0AC \uC7AC\uBC30\uC815", children: [error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("p", { className: "mb-3 text-sm", children: ["\uD604\uC7AC \uB2F4\uB2F9 \uAE30\uC0AC: ", detail.technician?.name ?? "-"] }), locked ? (_jsx("p", { className: "mb-4 text-sm text-neutral-500", children: "\uACB0\uC81C \uB300\uAE30 \uC774\uD6C4\uC5D0\uB294 \uAE30\uC0AC\uB97C \uB2E4\uC2DC \uBC30\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (_jsxs("div", { className: "mb-4 flex flex-wrap items-end gap-2", children: [_jsx(SelectBox, { value: technicianId, onChange: setTechnicianId, options: [
                            { value: "", label: "기사 선택" },
                            ...technicians.map((item) => ({
                                value: String(item.id),
                                label: `${item.name} · 점검 ${item.inspectionWaitingCount} · 수리 ${item.repairInProgressCount} · ${formatDurationMinutes(item.estimatedDurationMinutes)}`,
                            })),
                        ] }), _jsx(TextField, { className: "w-72", value: reason, onChange: setReason, placeholder: "\uC7AC\uBC30\uC815 \uC0AC\uC720" }), _jsx(Button, { onClick: () => void save(), disabled: pending || loading, children: "\uC7AC\uBC30\uC815" })] })), _jsx("h3", { className: "mb-2 text-sm font-semibold text-neutral-900", children: "\uBC30\uC815 \uC774\uB825" }), loading ? (_jsx("p", { className: "text-sm text-neutral-500", children: "\uBC30\uC815 \uC774\uB825\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." })) : history.length === 0 ? (_jsx("p", { className: "text-sm text-neutral-500", children: "\uBC30\uC815 \uC774\uB825\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (_jsx("ul", { className: "space-y-3", children: history.map((item, index) => (_jsxs("li", { className: "text-sm", children: [_jsxs("p", { className: "font-medium", children: [item.previousTechnician?.name ?? "-", " \u2192 ", item.newTechnician?.name ?? "-"] }), _jsxs("p", { className: "mt-1 text-neutral-500", children: [formatDateTime(item.createdAt), " \u00B7 ", item.changedBy?.name ?? "-", " \u00B7 ", item.reason ?? "-"] })] }, `${item.createdAt}:${item.newTechnician?.id ?? 0}:${index}`))) }))] }));
}
