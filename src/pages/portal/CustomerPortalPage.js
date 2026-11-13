import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { receptionStatusLabel } from "@/lib/asReceptionApi";
import { won } from "@/lib/format";
import { tossBankName } from "@/lib/tossBank";
import { cancelPortalPayment, decidePortalQuote, fetchPortal, InvalidPortalLinkError, startPortalPayment, } from "@/lib/portalApi";
import { isPaymentCanceled, paymentErrorMessage, portalFailUrl, portalSuccessUrl, requestTossPayment, } from "@/lib/tossPayments";
import { InfoRow, PortalFrame } from "@/pages/portal/PortalFrame";
const STEPS = ["접수", "점검", "견적 승인", "수리", "결제"];
// 고객에게 보이는 5단계. 보증 판정은 점검, 배송·수령·완료는 결제 단계에 둔다.
function stageIndex(status) {
    if (status === "RECEIVED") {
        return 0;
    }
    if (status === "INSPECTION" || status === "WARRANTY_REVIEW") {
        return 1;
    }
    if (status === "AWAITING_QUOTE_APPROVAL") {
        return 2;
    }
    if (status === "AWAITING_REPAIR" || status === "REPAIR_IN_PROGRESS") {
        return 3;
    }
    return 4;
}
export function CustomerPortalPage() {
    const { token = "" } = useParams();
    const [reloadKey, setReloadKey] = useState(0);
    const [requestKey, setRequestKey] = useState(`${token}:${reloadKey}`);
    const [load, setLoad] = useState({ kind: "loading" });
    const nextRequestKey = `${token}:${reloadKey}`;
    if (requestKey !== nextRequestKey) {
        setRequestKey(nextRequestKey);
        setLoad({ kind: "loading" });
    }
    useEffect(() => {
        const controller = new AbortController();
        let active = true;
        fetchPortal(token, controller.signal)
            .then((portal) => {
            if (active) {
                setLoad({ kind: "ready", portal });
            }
        })
            .catch((error) => {
            if (!active || controller.signal.aborted) {
                return;
            }
            if (error instanceof InvalidPortalLinkError) {
                setLoad({ kind: "invalid" });
                return;
            }
            setLoad({
                kind: "error",
                message: error instanceof Error ? error.message : "포털 정보를 불러오지 못했습니다.",
            });
        });
        return () => {
            active = false;
            controller.abort();
        };
    }, [token, reloadKey]);
    if (load.kind === "loading") {
        return (_jsx(PortalFrame, { children: _jsx("p", { className: "text-center text-sm text-neutral-600", children: "\uC548\uB0B4 \uB0B4\uC6A9\uC744 \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." }) }));
    }
    if (load.kind === "invalid") {
        return (_jsx(PortalFrame, { children: _jsx("p", { className: "text-center text-sm text-neutral-600", children: "\uB9C1\uD06C\uAC00 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4" }) }));
    }
    if (load.kind === "error") {
        return (_jsxs(PortalFrame, { children: [_jsx("p", { className: "text-center text-sm text-neutral-600", children: load.message }), _jsx(Button, { className: "mt-4 w-full", variant: "outline", onClick: () => setReloadKey((current) => current + 1), children: "\uB2E4\uC2DC \uBD88\uB7EC\uC624\uAE30" })] }));
    }
    return (_jsx(PortalFrame, { children: _jsx(PortalBody, { token: token, portal: load.portal, onRefresh: () => setReloadKey((current) => current + 1) }) }));
}
function PortalBody({ token, portal, onRefresh, }) {
    const { reception, quote, payment } = portal;
    const current = stageIndex(reception.status);
    const aborted = inspectionAborted(reception.status, reception.histories, quote);
    const repairSkipped = quote?.status === "REJECTED" && current > 3;
    const stepLabels = aborted ? ["접수", "점검", "견적 승인", "수리", "반환"] : STEPS;
    const lineEnd = aborted ? 1 : current;
    const [selected, setSelected] = useState(current);
    const [seenStatus, setSeenStatus] = useState(reception.status);
    const [receiptOpen, setReceiptOpen] = useState(false);
    if (seenStatus !== reception.status) {
        setSeenStatus(reception.status);
        setSelected(stageIndex(reception.status));
    }
    const timeline = [...reception.histories].reverse();
    const stageHistories = reception.histories.filter((item) => stageIndex(item.status) === selected).reverse();
    const showPayment = selected === 4 && payment !== null && payment.status !== "NOT_ISSUED";
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-start justify-between gap-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-base font-semibold text-neutral-900", children: "A/S \uC9C4\uD589" }), reception.receptionNumber !== null && reception.receptionNumber.trim() !== "" && (_jsx("p", { className: "mt-0.5 text-sm text-neutral-500", children: reception.receptionNumber }))] }), _jsx("span", { className: "shrink-0 rounded-md border border-blue-600 px-2 py-1 text-xs font-medium text-blue-600", children: receptionStatusLabel(reception.status) })] }), _jsxs("div", { className: "mt-4 rounded-lg border border-neutral-200 px-3 py-2.5", children: [_jsx("p", { className: "text-xs text-neutral-500", children: "\uC11C\uBC84\uC5D0\uC11C \uBC1C\uAE09\uD55C \uB9C1\uD06C" }), _jsxs("p", { className: "mt-1 break-all text-sm font-medium text-neutral-900", children: ["fixgo/", token] })] }), _jsxs("div", { className: "mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-neutral-200 px-3 py-3", children: [_jsx(SummaryItem, { label: "\uACE0\uAC1D", value: reception.customerName }), _jsx(SummaryItem, { label: "\uC5F0\uB77D\uCC98", value: reception.customerPhone }), _jsx(SummaryItem, { label: "\uC81C\uD488", value: reception.modelName }), _jsx(SummaryItem, { label: "\uC99D\uC0C1", value: reception.symptom })] }), _jsxs("section", { className: "mt-5", children: [_jsx("p", { className: "text-sm font-semibold text-neutral-900", children: "\uC9C4\uD589" }), _jsxs("ol", { className: "relative mt-3 grid grid-cols-5", children: [_jsx("div", { className: "absolute top-[7px] right-[10%] left-[10%] h-px bg-neutral-300" }), lineEnd > 0 && (_jsx("div", { className: "absolute top-[7px] left-[10%] h-px bg-blue-600", style: { width: `${(lineEnd / (STEPS.length - 1)) * 80}%` } })), stepLabels.map((label, index) => {
                                const skipped = (repairSkipped && index === 3) || (aborted && (index === 2 || index === 3));
                                const reached = !skipped && index <= current;
                                const active = index === selected;
                                return (_jsx("li", { className: "relative", children: _jsxs("button", { type: "button", disabled: !reached && !skipped, "aria-current": !skipped && index === current ? "step" : undefined, onClick: () => setSelected(index), className: "flex w-full flex-col items-center gap-2 disabled:cursor-default", children: [skipped ? (_jsx("span", { className: "relative z-10 flex h-3.5 w-3.5 items-center justify-center text-sm font-bold leading-none text-red-600", "aria-label": "\uAC74\uB108\uB700", children: "\u00D7" })) : (_jsx("span", { className: reached
                                                    ? `relative z-10 h-3.5 w-3.5 rounded-full bg-blue-600 ${active ? "ring-2 ring-blue-200 ring-offset-2" : ""}`
                                                    : "relative z-10 h-3.5 w-3.5 rounded-full bg-neutral-300" })), _jsx("span", { className: skipped
                                                    ? `text-center text-[11px] leading-tight font-semibold text-red-600 ${active ? "underline" : ""}`
                                                    : reached
                                                        ? `text-center text-[11px] leading-tight ${active ? "font-semibold text-blue-600" : "text-blue-600"}`
                                                        : "text-center text-[11px] leading-tight text-neutral-500", children: label })] }) }, label));
                            })] })] }), _jsxs("section", { className: "mt-5", children: [_jsx("p", { className: "text-sm font-semibold text-neutral-900", children: selected === current ? "현재 단계" : "이전 단계" }), _jsxs("div", { className: "mt-2 rounded-lg border border-neutral-300 px-3 py-3", children: [_jsx("p", { className: "text-sm font-semibold text-neutral-900", children: stepLabels[selected] }), stageLines(selected, reception.status, quote, payment, aborted).map((line) => (_jsx("p", { className: "text-sm text-neutral-700", children: line }, line))), selected === 0 && (_jsx(ReceiptDetails, { open: receiptOpen, reception: reception, onToggle: () => setReceiptOpen((open) => !open) })), selected === 2 && quote !== null && (_jsx(QuoteDetails, { token: token, quote: quote, onRefresh: onRefresh })), selected > 0 && selected < 4 && stageHistories.length > 0 && (_jsx(StageRecords, { histories: stageHistories })), showPayment && payment !== null && (_jsx("div", { className: "mt-3", children: _jsx(PaymentBody, { token: token, payment: payment, onRefresh: onRefresh }) }))] })] }), timeline.length > 0 && (_jsxs("section", { className: "mt-5", children: [_jsx("p", { className: "text-sm font-semibold text-neutral-900", children: "\uC9C4\uD589 \uC774\uB825" }), _jsx("ol", { className: "mt-2", children: timeline.map((item, index) => {
                            const changedAt = formatDateTime(item.changedAt);
                            return (_jsx("li", { className: "py-1.5 text-sm text-neutral-700", children: changedAt !== null ? `${changedAt} ${receptionStatusLabel(item.status)}` : receptionStatusLabel(item.status) }, `${item.status}-${item.changedAt ?? "none"}-${index}`));
                        }) })] }))] }));
}
function SummaryItem({ label, value }) {
    if (value === null || value.trim() === "") {
        return null;
    }
    return (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-neutral-500", children: label }), _jsx("p", { className: "mt-0.5 text-sm font-medium break-all text-neutral-900", children: value })] }));
}
function ReceiptDetails({ open, reception, onToggle, }) {
    return (_jsxs("div", { children: [_jsx(Button, { className: "mt-3 w-full", onClick: onToggle, children: open ? "접수증 닫기" : "접수증 보기" }), open && (_jsxs("dl", { className: "mt-2", children: [_jsx(Field, { label: "\uC811\uC218\uBC88\uD638", value: reception.receptionNumber }), _jsx(Field, { label: "\uC811\uC218 \uC2DC\uAC01", value: formatDateTime(reception.receivedAt) }), _jsx(Field, { label: "\uACE0\uAC1D\uBA85", value: reception.customerName }), _jsx(Field, { label: "\uC5F0\uB77D\uCC98", value: reception.customerPhone }), _jsx(Field, { label: "\uC81C\uD488", value: reception.modelName }), _jsx(Field, { label: "\uC2DC\uB9AC\uC5BC", value: reception.serialNumber }), _jsx(Field, { label: "\uACE0\uC7A5 \uC99D\uC0C1", value: reception.symptom }), _jsx(Field, { label: "\uC99D\uC0C1 \uC0C1\uC138", value: reception.symptomDetail })] }))] }));
}
function QuoteDetails({ token, quote, onRefresh, }) {
    const [pending, setPending] = useState(false);
    const [asking, setAsking] = useState(null);
    const [error, setError] = useState("");
    const pendingRef = useRef(false);
    async function decide(decision) {
        if (pendingRef.current) {
            return;
        }
        setAsking(null);
        pendingRef.current = true;
        setError("");
        setPending(true);
        try {
            await decidePortalQuote(token, decision);
            onRefresh();
        }
        catch (caught) {
            pendingRef.current = false;
            setPending(false);
            setError(caught instanceof Error ? caught.message : "견적을 처리하지 못했습니다. 다시 시도해 주세요.");
        }
    }
    return (_jsxs("div", { children: [_jsxs("div", { className: "mt-3 border-t border-neutral-100 pt-2", children: [_jsx("p", { className: "text-sm font-semibold text-neutral-900", children: "\uACAC\uC801\uC11C" }), _jsxs("dl", { children: [_jsx(Field, { label: "\uC9C4\uB2E8", value: quote.diagnosis }), _jsx(Field, { label: "\uBC1C\uD589 \uC2DC\uAC01", value: formatDateTime(quote.issuedAt) })] }), _jsxs("ul", { className: "mt-1 border-t border-neutral-100", children: [quote.items.map((item, index) => (_jsxs("li", { className: "flex items-baseline justify-between gap-3 border-b border-neutral-100 py-2 text-sm", children: [_jsxs("span", { className: "text-neutral-900", children: [item.name, item.quantity > 0 ? ` × ${item.quantity}` : ""] }), _jsx("span", { className: "shrink-0 font-medium text-neutral-900", children: won(item.amount) })] }, `${item.name}-${index}`))), quote.laborCost > 0 && (_jsxs("li", { className: "flex items-baseline justify-between gap-3 border-b border-neutral-100 py-2 text-sm", children: [_jsx("span", { className: "text-neutral-900", children: "\uACF5\uC784" }), _jsx("span", { className: "shrink-0 font-medium text-neutral-900", children: won(quote.laborCost) })] })), quote.inspectionCost > 0 && (_jsxs("li", { className: "flex items-baseline justify-between gap-3 border-b border-neutral-100 py-2 text-sm", children: [_jsx("span", { className: "text-neutral-900", children: "\uC810\uAC80\uBE44" }), _jsx("span", { className: "shrink-0 font-medium text-neutral-900", children: won(quote.inspectionCost) })] }))] }), _jsxs("div", { className: "flex items-baseline justify-between gap-3 py-2 text-sm", children: [_jsx("span", { className: "text-neutral-500", children: "\uD569\uACC4" }), _jsx("span", { className: "text-base font-semibold text-neutral-900", children: won(quote.totalAmount) })] })] }), quote.status === "PENDING" && (_jsxs("div", { className: "mt-3 grid grid-cols-2 gap-2", children: [_jsx(Button, { disabled: pending, onClick: () => setAsking("approve"), children: "\uACAC\uC801 \uC2B9\uC778" }), _jsx(Button, { variant: "outline", disabled: pending, onClick: () => setAsking("reject"), children: "\uACAC\uC801 \uAC70\uBD80" })] })), error !== "" && _jsx("p", { className: "mt-3 text-sm text-red-600", children: error }), asking !== null && (_jsx(ConfirmModal, { title: asking === "approve" ? "견적 승인" : "견적 거부", message: asking === "approve"
                    ? "견적을 승인하시겠습니까?"
                    : "견적을 거부하시겠습니까? 거부하면 점검비 결제로 넘어갑니다.", confirmLabel: asking === "approve" ? "승인" : "거부", onConfirm: () => void decide(asking), onClose: () => setAsking(null) }))] }));
}
function StageRecords({ histories }) {
    return (_jsx("ul", { className: "mt-3 border-t border-neutral-100 pt-2", children: histories.map((item, index) => {
            const changedAt = formatDateTime(item.changedAt);
            return (_jsx("li", { className: "py-1.5 text-sm text-neutral-700", children: changedAt !== null ? `${changedAt} ${receptionStatusLabel(item.status)}` : receptionStatusLabel(item.status) }, `${item.status}-${item.changedAt ?? "none"}-${index}`));
        }) }));
}
function inspectionAborted(status, histories, quote) {
    const returned = status === "AWAITING_SHIPMENT" || status === "AWAITING_PICKUP" || status === "COMPLETED";
    if (!returned || quote?.status === "APPROVED" || quote?.status === "REJECTED") {
        return false;
    }
    // 견적·수리·결제 이력이 없으면 점검 중 중단으로 반환 단계에 온 것이다.
    return !histories.some((item) => item.status === "AWAITING_QUOTE_APPROVAL"
        || item.status === "AWAITING_REPAIR"
        || item.status === "REPAIR_IN_PROGRESS"
        || item.status === "AWAITING_PAYMENT");
}
function stageLines(stage, status, quote, payment, aborted) {
    if (stage === 0) {
        return status === "RECEIVED" ? ["접수가 완료되었습니다.", "점검 전입니다."] : ["접수가 완료되었습니다."];
    }
    if (stage === 1) {
        if (aborted) {
            return ["점검 중 A/S를 중단했습니다."];
        }
        if (status === "INSPECTION") {
            return ["점검이 진행 중입니다.", "견적 전입니다."];
        }
        if (status === "WARRANTY_REVIEW") {
            return ["보증을 확인하고 있습니다.", "견적 전입니다."];
        }
        return ["점검이 완료되었습니다."];
    }
    if (stage === 2) {
        if (aborted) {
            return ["견적을 받지 않고 A/S를 중단했습니다."];
        }
        if (quote?.status === "APPROVED") {
            return ["견적을 승인했습니다."];
        }
        if (quote?.status === "REJECTED") {
            return ["견적을 거부했습니다."];
        }
        if (status === "AWAITING_QUOTE_APPROVAL" || quote?.status === "PENDING") {
            return ["견적 승인을 기다리고 있습니다."];
        }
        return ["견적 단계가 완료되었습니다."];
    }
    if (stage === 3) {
        if (aborted) {
            return ["수리를 진행하지 않았습니다."];
        }
        if (quote?.status === "REJECTED") {
            return ["견적 거부로 수리를 진행하지 않습니다."];
        }
        if (status === "AWAITING_REPAIR") {
            return ["수리를 기다리고 있습니다.", "결제 전입니다."];
        }
        if (status === "REPAIR_IN_PROGRESS") {
            return ["수리가 진행 중입니다.", "결제 전입니다."];
        }
        return ["수리가 완료되었습니다."];
    }
    if (aborted && status === "COMPLETED") {
        return ["A/S가 중단되어 제품 반환까지 마쳤습니다."];
    }
    if (status === "AWAITING_SHIPMENT" || status === "AWAITING_PICKUP") {
        if (quote?.status !== "APPROVED" && quote?.status !== "REJECTED") {
            return [
                "A/S가 중단되어 수리를 진행하지 않습니다.",
                status === "AWAITING_PICKUP" ? "수령을 기다리고 있습니다." : "배송을 기다리고 있습니다.",
            ];
        }
    }
    if (status === "AWAITING_SHIPMENT") {
        return ["결제가 완료되었습니다.", "배송을 기다리고 있습니다."];
    }
    if (status === "AWAITING_PICKUP") {
        return ["결제가 완료되었습니다.", "수령을 기다리고 있습니다."];
    }
    if (status === "COMPLETED") {
        return ["모든 단계가 완료되었습니다."];
    }
    if (payment === null || payment.status === "NOT_ISSUED") {
        return ["결제 전입니다."];
    }
    if (payment.status === "IN_PROGRESS") {
        return ["결제 결과를 확인하고 있습니다."];
    }
    if (payment.status === "WAITING_FOR_DEPOSIT") {
        return ["가상계좌 입금을 기다리고 있습니다."];
    }
    if (payment.status === "REFUNDED") {
        return ["환불이 완료되었습니다."];
    }
    if (payment.status === "PAID") {
        return ["결제가 완료되었습니다."];
    }
    return ["결제를 기다리고 있습니다."];
}
function PaymentBody({ token, payment, onRefresh, }) {
    if (payment.status === "IN_PROGRESS") {
        return _jsx(PaymentInProgress, { payment: payment });
    }
    if (payment.status === "UNPAID") {
        return _jsx(UnpaidPayment, { token: token, payment: payment });
    }
    if (payment.status === "WAITING_FOR_DEPOSIT") {
        return _jsx(WaitingDeposit, { token: token, payment: payment, onRefresh: onRefresh });
    }
    if (payment.status === "PAID" || payment.status === "REFUNDED") {
        return (_jsxs("dl", { children: [_jsx(Field, { label: "\uAE08\uC561", value: money(payment.amount), emphasize: true }), _jsx(Field, { label: "\uACB0\uC81C \uC218\uB2E8", value: methodLabel(payment.paymentMethod) }), _jsx(Field, { label: "\uACB0\uC81C \uC2DC\uAC01", value: formatDateTime(payment.paidAt) })] }));
    }
    return null;
}
function WaitingDeposit({ token, payment, onRefresh, }) {
    const [pending, setPending] = useState(false);
    const [asking, setAsking] = useState(false);
    const [error, setError] = useState("");
    const pendingRef = useRef(false);
    const account = payment.virtualAccount ?? null;
    async function cancelAccount() {
        if (pendingRef.current) {
            return;
        }
        setAsking(false);
        pendingRef.current = true;
        setError("");
        setPending(true);
        try {
            await cancelPortalPayment(token);
            onRefresh();
        }
        catch (caught) {
            pendingRef.current = false;
            setPending(false);
            setError(caught instanceof Error ? caught.message : "가상계좌를 취소하지 못했습니다. 다시 시도해 주세요.");
        }
    }
    return (_jsxs("section", { children: [_jsxs("dl", { children: [_jsx(Field, { label: "\uC740\uD589\uBA85", value: tossBankName(account?.bankName) }), _jsx(Field, { label: "\uACC4\uC88C\uBC88\uD638", value: account?.accountNumber ?? null }), _jsx(Field, { label: "\uC785\uAE08 \uAE30\uD55C", value: formatDateTime(account?.dueAt) })] }), _jsx(Button, { className: "mt-4 w-full", variant: "outline", disabled: pending, onClick: () => setAsking(true), children: "\uAC00\uC0C1\uACC4\uC88C \uCDE8\uC18C" }), error !== "" && _jsx("p", { className: "mt-3 text-sm text-red-600", children: error }), asking && (_jsx(ConfirmModal, { title: "\uAC00\uC0C1\uACC4\uC88C \uCDE8\uC18C", message: "\uBC1C\uAE09\uB41C \uAC00\uC0C1\uACC4\uC88C\uB97C \uCDE8\uC18C\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?", confirmLabel: "\uAC00\uC0C1\uACC4\uC88C \uCDE8\uC18C", cancelLabel: "\uB2EB\uAE30", onConfirm: () => void cancelAccount(), onClose: () => setAsking(false) }))] }));
}
function PaymentInProgress({ payment }) {
    return (_jsxs("section", { children: [_jsxs("dl", { children: [_jsx(Field, { label: "\uD56D\uBAA9\uBA85", value: payment.orderName }), _jsx(Field, { label: "\uAE08\uC561", value: money(payment.amount), emphasize: true })] }), _jsx("p", { className: "mt-3 text-sm text-neutral-600", children: "\uACB0\uC81C \uACB0\uACFC\uB97C \uD655\uC778\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4. \uD655\uC778\uC774 \uB05D\uB0A0 \uB54C\uAE4C\uC9C0 \uB2E4\uC2DC \uACB0\uC81C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." })] }));
}
function UnpaidPayment({ token, payment }) {
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    async function pay(method) {
        setError("");
        setPending(true);
        try {
            const started = await startPortalPayment(token);
            await requestTossPayment({
                method,
                amount: started.amount,
                orderId: started.orderId,
                orderName: started.orderName,
                successUrl: portalSuccessUrl(token),
                failUrl: portalFailUrl(token),
            });
        }
        catch (caught) {
            if (!isPaymentCanceled(caught)) {
                setError(paymentErrorMessage(caught));
            }
        }
        finally {
            setPending(false);
        }
    }
    return (_jsxs("section", { children: [_jsxs("dl", { children: [_jsx(Field, { label: "\uD56D\uBAA9\uBA85", value: payment.orderName }), _jsx(Field, { label: "\uAE08\uC561", value: money(payment.amount), emphasize: true })] }), _jsxs("div", { className: "mt-4 grid grid-cols-2 gap-2", children: [_jsx(Button, { className: "h-11", disabled: pending, onClick: () => void pay("CARD"), children: "\uCE74\uB4DC/\uAC04\uD3B8\uACB0\uC81C" }), _jsx(Button, { className: "h-11", variant: "outline", disabled: pending, onClick: () => void pay("VIRTUAL_ACCOUNT"), children: "\uAC00\uC0C1\uACC4\uC88C" })] }), pending && _jsx("p", { className: "mt-3 text-center text-xs text-neutral-500", children: "\uACB0\uC81C\uCC3D\uC744 \uC900\uBE44\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4." }), error !== "" && _jsx("p", { className: "mt-3 text-sm text-red-600", children: error })] }));
}
function Field({ label, value, emphasize = false }) {
    if (value === null || value.trim() === "") {
        return null;
    }
    return _jsx(InfoRow, { label: label, value: value, emphasize: emphasize });
}
function money(amount) {
    if (amount === null) {
        return null;
    }
    return won(amount);
}
function formatDateTime(value) {
    if (value === null || value === undefined || value.trim() === "") {
        return null;
    }
    const matched = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value);
    if (matched === null) {
        return value;
    }
    return `${matched[1]} ${matched[2]}`;
}
function methodLabel(method) {
    if (method === "CARD") {
        return "카드";
    }
    if (method === "EASY_PAY") {
        return "간편결제";
    }
    if (method === "VIRTUAL_ACCOUNT") {
        return "가상계좌";
    }
    if (method === "CASH") {
        return "현금";
    }
    return null;
}
