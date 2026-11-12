import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { confirmPaymentOnce, parseAmountParam } from "@/lib/portalApi";
import { PortalFrame } from "@/pages/portal/PortalFrame";
export function PortalPaymentSuccessPage() {
    const { token = "" } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = parseAmountParam(params.get("amount"));
    const canConfirm = paymentKey !== null && paymentKey !== "" && orderId !== null && orderId !== "" && amount !== null;
    const [attempt, setAttempt] = useState(0);
    const requestKey = canConfirm ? `${paymentKey}:${orderId}:${amount}:${attempt}` : "invalid";
    const [trackedKey, setTrackedKey] = useState(requestKey);
    const [phase, setPhase] = useState("pending");
    const [message, setMessage] = useState("");
    if (trackedKey !== requestKey) {
        setTrackedKey(requestKey);
        setPhase("pending");
        setMessage("");
    }
    useEffect(() => {
        if (!canConfirm || paymentKey === null || orderId === null || amount === null) {
            return;
        }
        let active = true;
        confirmPaymentOnce({ paymentKey, orderId, amount })
            .then(() => {
            if (active) {
                navigate(`/portal/${token}`, { replace: true });
            }
        })
            .catch((error) => {
            if (!active) {
                return;
            }
            setPhase("error");
            setMessage(error instanceof Error ? error.message : "결제 승인에 실패했습니다. 다시 시도해 주세요.");
        });
        return () => {
            active = false;
        };
    }, [amount, attempt, canConfirm, navigate, orderId, paymentKey, token]);
    const failed = !canConfirm || phase === "error";
    const failureMessage = !canConfirm ? "결제 승인에 필요한 정보가 없습니다." : message;
    return (_jsx(PortalFrame, { children: failed ? (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-red-600", children: failureMessage }), _jsxs("div", { className: "mt-4 flex flex-col gap-2", children: [canConfirm && (_jsx(Button, { onClick: () => setAttempt((current) => current + 1), children: "\uC2B9\uC778 \uB2E4\uC2DC \uC2DC\uB3C4" })), _jsx(Button, { variant: "outline", onClick: () => navigate(`/portal/${token}`), children: "\uD3EC\uD138\uB85C \uB3CC\uC544\uAC00\uAE30" })] })] })) : (_jsx("p", { className: "text-center text-sm text-neutral-600", children: "\uACB0\uC81C\uB97C \uD655\uC778\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4." })) }));
}
