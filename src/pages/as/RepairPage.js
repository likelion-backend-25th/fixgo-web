import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Panel";
import { formatDateTime, won } from "@/lib/format";
import { isAbortError } from "@/lib/apiClient";
import { applyRepairPartStock } from "@/lib/partApi";
import { completeMyRepair, completeRepair, fetchRepairDetail, fetchRepairWorks, repairDecisionLabel, repairStatusLabel, startRepair, warrantyResultLabel, } from "@/lib/repair";
import { AsSummary } from "@/pages/as/AsSummary";
import { ProgressTabs } from "@/pages/as/ProgressTabs";
import { ReceptionProgress } from "@/pages/as/ReceptionProgress";
import { useSessionStore } from "@/stores/useSessionStore";
export function RepairPage() {
    return (_jsx(ReceptionProgress, { render: ({ reception, repair }, reload) => (_jsx(RepairView, { reception: reception, repair: repair, onStarted: reload })) }));
}
function completedReceptionMessage(status) {
    if (status === "AWAITING_PAYMENT") {
        return "수리가 완료되어 결제 대기입니다.";
    }
    if (status === "AWAITING_SHIPMENT") {
        return "수리가 완료되어 배송 대기입니다. 배송 관리에서 출고할 수 있습니다.";
    }
    if (status === "AWAITING_PICKUP") {
        return "수리가 완료되어 수령 대기입니다. 배송 관리에서 방문 수령을 처리할 수 있습니다.";
    }
    if (status === "REPAIR_IN_PROGRESS") {
        return "수리는 완료됐지만 접수가 수리 중에 남아 있습니다. 배송·수령 대기로 전환해 주세요.";
    }
    return "수리가 완료된 건입니다.";
}
function RepairView({ reception, repair, onStarted, }) {
    const [detail, setDetail] = useState(null);
    const [works, setWorks] = useState([]);
    const [loading, setLoading] = useState(repair !== null);
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    const navigate = useNavigate();
    const role = useSessionStore((state) => state.user?.role);
    useEffect(() => {
        if (repair === null) {
            return;
        }
        const controller = new AbortController();
        const repairId = repair.id;
        async function loadRepair() {
            setLoading(true);
            setError("");
            setDetail(null);
            setWorks([]);
            try {
                // 접수에 연결된 수리 상세와 작업 내역을 함께 조회한다.
                const [repairResult, workResult] = await Promise.all([
                    fetchRepairDetail(repairId, controller.signal),
                    fetchRepairWorks(repairId, controller.signal),
                ]);
                if (controller.signal.aborted) {
                    return;
                }
                setDetail(repairResult);
                setWorks(workResult);
            }
            catch (cause) {
                if (controller.signal.aborted || isAbortError(cause)) {
                    return;
                }
                setError(cause instanceof Error ? cause.message : "수리 정보를 불러오지 못했습니다.");
            }
            finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }
        void loadRepair();
        return () => controller.abort();
    }, [repair]);
    const rejected = detail?.status === "REJECTED";
    const inspectionEnded = rejected
        && (reception.status === "AWAITING_SHIPMENT" || reception.status === "AWAITING_PICKUP");
    const approved = detail?.status === "APPROVED";
    const agreed = detail?.status === "REPAIRING" || detail?.status === "COMPLETED";
    const completed = detail?.status === "COMPLETED";
    const needsReturnRecovery = completed && reception.status === "REPAIR_IN_PROGRESS"
        && (detail.warrantyResult !== "PAID" || detail.finalAmount <= 0);
    const isManagerRole = role === "ADMIN" || role === "MANAGER";
    const canComplete = (role === "TECHNICIAN" && detail?.status === "REPAIRING") ||
        (isManagerRole && (detail?.status === "REPAIRING" || needsReturnRecovery));
    async function finishRepair(repairId) {
        if (role === "TECHNICIAN") {
            // 상태 변경과 재고 차감을 백엔드 /complete에서 한 번에 처리한다.
            await completeMyRepair(repairId);
            return;
        }
        await completeRepair(repairId);
        // 수리 완료로 바꿀 때만 사용 부품 재고를 뺀다. 배송·수령 대기 전환은 이미 반영된 재고를 다시 빼지 않는다.
        if (!needsReturnRecovery) {
            await applyRepairPartStock(repairId);
        }
    }
    async function runRepairAction(action) {
        if (detail === null) {
            return;
        }
        setPending(true);
        setError("");
        try {
            await action(detail.id);
            onStarted();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "수리 상태를 변경하지 못했습니다.");
        }
        finally {
            setPending(false);
        }
    }
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(AsSummary, { record: reception }), role === "TECHNICIAN" && !inspectionEnded && (_jsx(ProgressTabs, { receptionId: reception.id, current: "repair" })), repair === null && _jsx(Notice, { children: "\uC544\uC9C1 A/S \uC9C4\uD589 \uC804\uC785\uB2C8\uB2E4." }), repair !== null && loading && _jsx(Notice, { children: "\uC218\uB9AC \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." }), error !== "" && _jsx(Notice, { tone: "error", children: error }), detail !== null && inspectionEnded && (_jsxs("div", { className: "space-y-4", children: [_jsxs(Notice, { children: ["A/S\uB97C \uC911\uB2E8\uD588\uC2B5\uB2C8\uB2E4. ", reception.returnMethod === "PICKUP" ? "수령 대기" : "배송 대기", "\uB85C \uB118\uC5B4\uAC00 \uC810\uAC80\uC774 \uB05D\uB0AC\uC2B5\uB2C8\uB2E4."] }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { onClick: () => navigate("/as/list"), children: "\uBAA9\uB85D\uC73C\uB85C" }) })] })), detail !== null && !inspectionEnded && (_jsxs(_Fragment, { children: [_jsxs("section", { className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", children: [_jsx("h2", { className: "mb-4 text-lg font-semibold", children: "\uC218\uB9AC \uC815\uBCF4" }), _jsxs("dl", { className: "grid grid-cols-1 gap-4 text-sm sm:grid-cols-2", children: [_jsxs("div", { children: [_jsx("dt", { className: "text-neutral-500", children: "\uC218\uB9AC ID" }), _jsxs("dd", { className: "mt-1 font-medium", children: ["#", detail.id] })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-neutral-500", children: "\uC811\uC218 ID" }), _jsxs("dd", { className: "mt-1 font-medium", children: ["#", detail.asReceptionId] })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-neutral-500", children: "\uC218\uB9AC \uC0C1\uD0DC" }), _jsx("dd", { className: "mt-1 font-medium", children: repairStatusLabel(detail.status) })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-neutral-500", children: "\uC218\uB9AC \uD310\uC815" }), _jsx("dd", { className: "mt-1 font-medium", children: repairDecisionLabel(detail.repairDecision) })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-neutral-500", children: "\uBCF4\uC99D \uACB0\uACFC" }), _jsx("dd", { className: "mt-1 font-medium", children: warrantyResultLabel(detail.warrantyResult) })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-neutral-500", children: "\uB2F4\uB2F9 \uAE30\uC0AC" }), _jsxs("dd", { className: "mt-1 font-medium", children: [reception.technician?.name ?? "-", reception.technician?.id !== detail.technicianId && (_jsxs("span", { className: "text-red-600", children: [" (\uC218\uB9AC \uAE30\uB85D #", detail.technicianId, ")"] }))] })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-neutral-500", children: "\uB4F1\uB85D\uC77C" }), _jsx("dd", { className: "mt-1 font-medium", children: formatDateTime(detail.createdAt) })] }), _jsxs("div", { children: [_jsx("dt", { className: "text-neutral-500", children: "\uC218\uC815\uC77C" }), _jsx("dd", { className: "mt-1 font-medium", children: formatDateTime(detail.updatedAt) })] })] }), _jsxs("div", { className: "mt-4 border-t border-neutral-200 pt-4", children: [_jsx("h3", { className: "mb-2 font-medium", children: "\uC9C4\uB2E8 \uB0B4\uC6A9" }), _jsx("p", { className: "whitespace-pre-wrap text-sm text-neutral-700", children: detail.diagnosis || "등록된 진단 내용이 없습니다." })] }), _jsxs("div", { className: "mt-4", children: [_jsx("h3", { className: "mb-2 font-medium", children: "\uC218\uB9AC \uB0B4\uC6A9" }), _jsx("p", { className: "whitespace-pre-wrap text-sm text-neutral-700", children: detail.workNote || "등록된 수리 내용이 없습니다." })] }), detail.reason && (_jsxs("div", { className: "mt-4", children: [_jsx("h3", { className: "mb-2 font-medium", children: "\uD310\uC815 \uC0AC\uC720" }), _jsx("p", { className: "whitespace-pre-wrap text-sm text-neutral-700", children: detail.reason })] })), detail.reasonForRejection && (_jsxs("div", { className: "mt-4", children: [_jsx("h3", { className: "mb-2 font-medium", children: "\uBC18\uB824 \uC0AC\uC720" }), _jsx("p", { className: "whitespace-pre-wrap text-sm text-red-600", children: detail.reasonForRejection })] }))] }), rejected && (_jsx(Notice, { tone: "error", children: "\uC218\uB9AC\uAC00 \uBC18\uB824\uB41C \uAC74\uC785\uB2C8\uB2E4. \uC218\uB9AC \uC791\uC5C5\uC744 \uC9C4\uD589\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." })), approved && role === "TECHNICIAN" && (_jsxs("div", { className: "flex items-center justify-between gap-3", children: [_jsx(Notice, { children: detail.warrantyResult === "FREE"
                                    ? "무상 수리로 확정되어 수리 대기입니다. 수리를 시작하면 수리 중으로 바뀝니다."
                                    : "고객이 견적을 승인했습니다. 수리를 시작하면 수리 중으로 바뀝니다." }), _jsx(Button, { disabled: pending, onClick: () => void runRepairAction(startRepair), children: pending ? "수리 시작 중…" : "수리 시작" })] })), !rejected && !agreed && !approved && (_jsx(Notice, { children: "\uD604\uC7AC \uC0C1\uD0DC\uC5D0\uC11C\uB294 \uC218\uB9AC \uC791\uC5C5\uC744 \uC9C4\uD589\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC218\uB9AC \uC2DC\uC791 \uCC98\uB9AC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4." })), canComplete && (_jsx(Button, { disabled: pending, onClick: () => void runRepairAction(finishRepair), children: pending ? "처리 중…" : needsReturnRecovery ? "배송·수령 대기로 전환" : "수리 완료" })), completed && _jsx(Notice, { children: completedReceptionMessage(reception.status) }), agreed && (_jsxs("section", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("h2", { className: "mb-3 text-lg font-semibold", children: "\uC218\uB9AC \uC791\uC5C5 \uB0B4\uC5ED" }), _jsx("div", { className: "overflow-x-auto rounded-xl border border-neutral-200 bg-white", children: _jsxs("table", { className: "w-full min-w-[480px] text-sm", children: [_jsx("thead", { className: "bg-neutral-100 text-left", children: _jsxs("tr", { children: [_jsx("th", { className: "px-3 py-3 font-medium", children: "\uC791\uC5C5\uBA85" }), _jsx("th", { className: "px-3 py-3 font-medium", children: "\uD504\uB9AC\uC14B" }), _jsx("th", { className: "px-3 py-3 font-medium", children: "\uB4F1\uB85D\uC77C" })] }) }), _jsx("tbody", { children: works.length > 0 ? (works.map((work) => (_jsxs("tr", { className: "border-t border-neutral-200", children: [_jsx("td", { className: "px-3 py-3", children: work.workName }), _jsx("td", { className: "px-3 py-3", children: work.repairPresetName ?? "-" }), _jsx("td", { className: "px-3 py-3", children: formatDateTime(work.createdAt) })] }, work.id)))) : (_jsx("tr", { children: _jsx("td", { colSpan: 3, className: "px-3 py-6 text-center text-neutral-500", children: "\uB4F1\uB85D\uB41C \uC218\uB9AC \uC791\uC5C5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." }) })) })] }) })] }), _jsxs("div", { className: "rounded-xl border border-neutral-200 bg-white p-4", children: [_jsx("h2", { className: "mb-3 font-semibold", children: "\uC218\uB9AC\uBE44 \uB0B4\uC5ED" }), _jsxs("dl", { className: "space-y-3 text-sm", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("dt", { className: "text-neutral-500", children: "\uACF5\uC784\uBE44" }), _jsx("dd", { children: won(detail.laborRate) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("dt", { className: "text-neutral-500", children: "\uC810\uAC80\uBE44" }), _jsx("dd", { children: won(detail.inspectionCost) })] }), _jsxs("div", { className: "flex justify-between border-t border-neutral-200 pt-3 font-semibold", children: [_jsx("dt", { children: "\uCD5C\uC885 \uC218\uB9AC\uBE44" }), _jsx("dd", { children: won(detail.finalAmount) })] })] })] })] }))] }))] }));
}
