import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SelectBox, TextArea, TextField } from "@/components/ui/Field";
import { InfoField, Notice, Panel } from "@/components/ui/Panel";
import { won } from "@/lib/format";
import { useSessionStore } from "@/stores/useSessionStore";
import { tossBankName } from "@/lib/tossBank";
import { fetchPaymentDetail, paymentBillStatusLabel, payByCash, paymentMethodLabel, refundPayment, } from "@/lib/paymentApi";
// 새 접수번호 AS-yyMMdd-순번은 끝자리가 접수 ID다.
function receptionLink(receptionNumber) {
    const matched = /^AS-\d{6}-(\d+)$/.exec(receptionNumber);
    const id = matched === null ? Number.NaN : Number(matched[1]);
    if (!Number.isInteger(id) || id <= 0) {
        return receptionNumber;
    }
    return (_jsx(Link, { className: "text-blue-600", to: `/as/details/${id}`, children: receptionNumber }));
}
const bankOptions = [
    { value: "", label: "은행 선택" },
    { value: "06", label: "KB국민은행" },
    { value: "88", label: "신한은행" },
    { value: "20", label: "우리은행" },
    { value: "81", label: "하나은행" },
    { value: "11", label: "NH농협은행" },
    { value: "03", label: "IBK기업은행" },
    { value: "90", label: "카카오뱅크" },
    { value: "89", label: "케이뱅크" },
    { value: "92", label: "토스뱅크" },
    { value: "31", label: "iM뱅크(대구)" },
    { value: "32", label: "부산은행" },
    { value: "39", label: "경남은행" },
    { value: "34", label: "광주은행" },
    { value: "37", label: "전북은행" },
    { value: "35", label: "제주은행" },
    { value: "71", label: "우체국" },
    { value: "23", label: "SC제일은행" },
    { value: "07", label: "Sh수협은행" },
    { value: "45", label: "새마을금고" },
    { value: "48", label: "신협" },
];
export function PaymentDetailPage() {
    const { billId = "" } = useParams();
    const canManage = useSessionStore((state) => state.user?.role !== "TECHNICIAN");
    const [reloadKey, setReloadKey] = useState(0);
    const [load, setLoad] = useState({ kind: "loading" });
    useEffect(() => {
        if (!/^\d+$/.test(billId)) {
            setLoad({ kind: "invalid" });
            return;
        }
        const controller = new AbortController();
        setLoad({ kind: "loading" });
        fetchPaymentDetail(Number(billId), controller.signal)
            .then((detail) => {
            if (!controller.signal.aborted) {
                setLoad({ kind: "ready", detail });
            }
        })
            .catch((cause) => {
            if (controller.signal.aborted || (cause instanceof DOMException && cause.name === "AbortError")) {
                return;
            }
            const message = cause instanceof Error ? cause.message : "결제 정보를 불러오지 못했습니다.";
            if (message === "결제 정보를 찾을 수 없습니다." || message === "결제 데이터가 없습니다.") {
                setLoad({ kind: "invalid" });
                return;
            }
            setLoad({ kind: "error", message });
        });
        return () => controller.abort();
    }, [billId, reloadKey]);
    if (load.kind === "loading") {
        return _jsx("p", { className: "text-sm text-neutral-600", children: "\uACB0\uC81C \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." });
    }
    if (load.kind === "invalid") {
        return _jsx(Notice, { tone: "error", children: "\uACB0\uC81C \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." });
    }
    if (load.kind === "error") {
        return _jsx(Notice, { tone: "error", children: load.message });
    }
    const detail = load.detail;
    const reception = detail.reception;
    const account = detail.virtualAccount;
    const history = detail.paymentHistory;
    const refund = detail.refundHistory;
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("section", { className: "rounded-xl border border-neutral-200 bg-white p-5 shadow-sm", children: _jsxs("dl", { className: "grid grid-cols-2 gap-4 lg:grid-cols-4", children: [_jsx(InfoField, { label: "\uACE0\uAC1D\uBA85", value: text(reception.customerName) }), _jsx(InfoField, { label: "\uC811\uC218\uBC88\uD638", value: receptionLink(reception.asReceptionNumber) }), _jsx(InfoField, { label: "\uC81C\uD488", value: text(reception.productName) }), _jsx(InfoField, { label: "\uC99D\uC0C1", value: text(reception.symptom) }), _jsx(InfoField, { label: "\uCCAD\uAD6C\uAE08\uC561", value: won(detail.amount) }), _jsx(InfoField, { label: "\uACB0\uC81C\uC0C1\uD0DC", value: _jsx("span", { className: `rounded-md px-2 py-1 text-xs font-medium ${statusClass(detail)}`, children: headlineStatus(detail) }) }), _jsx(InfoField, { label: "\uC2B9\uC778\uC2DC\uAC01", value: formatDateTime(history?.approvedAt ?? null) })] }) }), history !== null && (_jsx(Panel, { title: "\uACB0\uC81C", children: _jsxs("dl", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(InfoField, { label: "\uC8FC\uBB38\uBC88\uD638", value: history.orderId }), _jsx(InfoField, { label: "\uACB0\uC81C \uAE08\uC561", value: won(history.amount) }), _jsx(InfoField, { label: "\uACB0\uC81C \uC218\uB2E8", value: paymentMethodLabel(history.paymentMethod) }), _jsx(InfoField, { label: "\uC2B9\uC778 \uC2DC\uAC01", value: formatDateTime(history.approvedAt) })] }) })), account !== null && (_jsx(Panel, { title: "\uAC00\uC0C1\uACC4\uC88C", children: _jsxs("dl", { className: "grid gap-4 sm:grid-cols-3", children: [_jsx(InfoField, { label: "\uC740\uD589", value: text(tossBankName(account.bankCode)) }), _jsx(InfoField, { label: "\uACC4\uC88C\uBC88\uD638", value: text(account.accountNumber) }), _jsx(InfoField, { label: "\uC785\uAE08 \uAE30\uD55C", value: formatDateTime(account.dueAt) })] }) })), refund !== null && (_jsx(Panel, { title: "\uD658\uBD88", children: _jsxs("dl", { className: "grid gap-4 sm:grid-cols-2", children: [_jsx(InfoField, { label: "\uD658\uBD88 \uAE08\uC561", value: refund.amount === null ? "-" : won(refund.amount) }), _jsx(InfoField, { label: "\uD658\uBD88 \uC0C1\uD0DC", value: refundStatusLabel(refund.status) }), _jsx(InfoField, { label: "\uD658\uBD88 \uC0AC\uC720", value: text(refund.cancelReason) }), _jsx(InfoField, { label: "\uD658\uBD88 \uC2DC\uAC01", value: formatDateTime(refund.canceledAt) })] }) })), canManage && canPayByCash(detail) && (_jsx(CashPaymentForm, { billId: detail.billId, amount: detail.amount, onDone: () => setReloadKey((current) => current + 1) })), detail.status === "UNPAID" && detail.paymentStatus === "IN_PROGRESS" && (_jsx(Notice, { children: "\uACB0\uC81C \uACB0\uACFC\uB97C \uD655\uC778\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4. \uD655\uC778\uC774 \uB05D\uB0A0 \uB54C\uAE4C\uC9C0 \uB2E4\uC2DC \uACB0\uC81C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." })), canManage && detail.status === "UNPAID" && detail.paymentStatus !== "IN_PROGRESS" && !canPayByCash(detail) && (_jsx(Notice, { children: "\uBC1C\uAE09\uB41C \uAC00\uC0C1\uACC4\uC88C\uAC00 \uC788\uC5B4 \uD604\uAE08\uC73C\uB85C \uBC1B\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uAC00\uC0C1\uACC4\uC88C\uB294 \uBA3C\uC800 \uCDE8\uC18C\uD574 \uC8FC\uC138\uC694." })), canManage && detail.refundable && (_jsx(RefundForm, { billId: detail.billId, method: detail.paymentMethod, onDone: () => setReloadKey((current) => current + 1) }))] }));
}
// 백엔드는 미결제이고 진행 중·입금 대기·완료 시도가 없을 때만 현금 결제를 받는다. 금액은 청구서 금액이다.
function canPayByCash(detail) {
    if (detail.status !== "UNPAID" || detail.virtualAccount !== null) {
        return false;
    }
    const status = detail.paymentStatus;
    return status !== "IN_PROGRESS" && status !== "WAITING_FOR_DEPOSIT" && status !== "DONE";
}
function CashPaymentForm({ billId, amount, onDone, }) {
    const [pending, setPending] = useState(false);
    const [asking, setAsking] = useState(false);
    const [error, setError] = useState("");
    const pendingRef = useRef(false);
    async function submit() {
        if (pendingRef.current) {
            return;
        }
        setAsking(false);
        setError("");
        pendingRef.current = true;
        setPending(true);
        try {
            await payByCash(billId);
            onDone();
        }
        catch (caught) {
            pendingRef.current = false;
            setPending(false);
            setError(caught instanceof Error ? caught.message : "현금 결제하지 못했습니다. 다시 시도해 주세요.");
        }
    }
    return (_jsxs(Panel, { title: "\uD604\uAE08 \uACB0\uC81C", children: [_jsx("p", { className: "text-sm text-neutral-600", children: "\uD604\uC7A5\uC5D0\uC11C \uBC1B\uC740 \uD604\uAE08\uC744 \uCCAD\uAD6C \uAE08\uC561 \uADF8\uB300\uB85C \uACB0\uC81C \uCC98\uB9AC\uD569\uB2C8\uB2E4." }), _jsx("dl", { className: "mt-4", children: _jsx(InfoField, { label: "\uACB0\uC81C \uAE08\uC561", value: won(amount) }) }), error !== "" && _jsx("p", { className: "mt-3 text-sm text-red-600", children: error }), _jsx(Button, { className: "mt-4", disabled: pending, onClick: () => setAsking(true), children: "\uD604\uAE08 \uACB0\uC81C" }), asking && (_jsx(ConfirmModal, { title: "\uD604\uAE08 \uACB0\uC81C", message: `청구 금액 ${won(amount)}을 현금으로 결제 처리하시겠습니까?`, confirmLabel: "\uD604\uAE08 \uACB0\uC81C", onConfirm: () => void submit(), onClose: () => setAsking(false) }))] }));
}
function RefundForm({ billId, method, onDone, }) {
    const needsAccount = method === "VIRTUAL_ACCOUNT";
    const [reason, setReason] = useState("");
    const [bank, setBank] = useState("");
    const [accountNumber, setAccountNumber] = useState("");
    const [holderName, setHolderName] = useState("");
    const [pending, setPending] = useState(false);
    const [asking, setAsking] = useState(false);
    const [error, setError] = useState("");
    const pendingRef = useRef(false);
    function ask() {
        if (pendingRef.current) {
            return;
        }
        const cancelReason = reason.trim();
        if (cancelReason === "") {
            setError("환불 사유를 입력해 주세요.");
            return;
        }
        if (needsAccount && (bank === "" || accountNumber.trim() === "" || holderName.trim() === "")) {
            setError("가상계좌 환불은 은행, 계좌번호, 예금주가 필요합니다.");
            return;
        }
        setError("");
        setAsking(true);
    }
    async function submit() {
        if (pendingRef.current) {
            return;
        }
        const cancelReason = reason.trim();
        setAsking(false);
        pendingRef.current = true;
        setPending(true);
        try {
            await refundPayment(billId, cancelReason, needsAccount
                ? { bank, accountNumber: accountNumber.trim(), holderName: holderName.trim() }
                : null);
            onDone();
        }
        catch (caught) {
            pendingRef.current = false;
            setPending(false);
            setError(caught instanceof Error ? caught.message : "환불하지 못했습니다. 다시 시도해 주세요.");
        }
    }
    return (_jsxs(Panel, { title: "\uD658\uBD88", children: [_jsx("p", { className: "text-sm text-neutral-600", children: needsAccount ? "가상계좌로 받은 결제입니다. 환불받을 계좌를 입력해 주세요." : "결제 완료된 금액을 전액 환불합니다." }), _jsxs("div", { className: "mt-4 grid gap-3", children: [_jsx(TextArea, { label: "\uD658\uBD88 \uC0AC\uC720", value: reason, onChange: setReason, rows: 3, placeholder: "\uD658\uBD88 \uC0AC\uC720" }), needsAccount && (_jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [_jsxs("label", { className: "block text-sm", children: [_jsx("span", { className: "form-label mb-1.5 block", children: "\uC740\uD589" }), _jsx(SelectBox, { className: "w-full", value: bank, onChange: setBank, options: bankOptions })] }), _jsx(TextField, { label: "\uACC4\uC88C\uBC88\uD638", value: accountNumber, onChange: setAccountNumber, placeholder: "\uC22B\uC790\uB9CC \uC785\uB825" }), _jsx(TextField, { label: "\uC608\uAE08\uC8FC", value: holderName, onChange: setHolderName })] }))] }), error !== "" && _jsx("p", { className: "mt-3 text-sm text-red-600", children: error }), _jsx(Button, { className: "mt-4", disabled: pending, onClick: ask, children: "\uD658\uBD88" }), asking && (_jsx(ConfirmModal, { title: "\uD658\uBD88", message: "\uC774 \uACB0\uC81C\uB97C \uD658\uBD88\uD558\uC2DC\uACA0\uC2B5\uB2C8\uAE4C?", confirmLabel: "\uD658\uBD88", onConfirm: () => void submit(), onClose: () => setAsking(false) }))] }));
}
function headlineStatus(detail) {
    if (detail.status === "UNPAID" && detail.paymentStatus === "IN_PROGRESS") {
        return "결제 진행 중";
    }
    return paymentBillStatusLabel(detail.status);
}
function statusClass(detail) {
    if (detail.status === "UNPAID" && detail.paymentStatus === "IN_PROGRESS") {
        return "bg-amber-50 text-amber-700";
    }
    if (detail.status === "PAID") {
        return "bg-green-50 text-green-600";
    }
    if (detail.status === "UNPAID") {
        return "bg-blue-50 text-blue-600";
    }
    return "bg-red-50 text-red-600";
}
function refundStatusLabel(status) {
    if (status === "IN_PROGRESS") {
        return "환불 진행";
    }
    if (status === "DONE") {
        return "환불 완료";
    }
    return "환불 실패";
}
function text(value) {
    if (value === null || value.trim() === "") {
        return "-";
    }
    return value;
}
function formatDateTime(value) {
    if (value === null || value.trim() === "") {
        return "-";
    }
    const matched = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value);
    if (matched === null) {
        return value;
    }
    return `${matched[1]} ${matched[2]}`;
}
