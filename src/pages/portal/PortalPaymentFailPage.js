import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { InfoRow, PortalFrame } from "@/pages/portal/PortalFrame";
export function PortalPaymentFailPage() {
    const { token = "" } = useParams();
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const code = params.get("code") ?? "";
    const message = params.get("message") ?? "";
    if (code === "PAY_PROCESS_CANCELED" || code === "USER_CANCEL" || message.includes("취소되었습니다") || message.includes("결제를 취소")) {
        return _jsx(Navigate, { to: `/portal/${token}`, replace: true });
    }
    return (_jsxs(PortalFrame, { children: [_jsx("h2", { className: "text-sm font-semibold text-neutral-900", children: "\uACB0\uC81C \uC2E4\uD328" }), _jsxs("dl", { className: "mt-2", children: [_jsx(InfoRow, { label: "\uCF54\uB4DC", value: code === "" ? "—" : code }), _jsx(InfoRow, { label: "\uBA54\uC2DC\uC9C0", value: message === "" ? "—" : message })] }), _jsx(Button, { className: "mt-5 w-full", variant: "outline", onClick: () => navigate(`/portal/${token}`), children: "\uD3EC\uD138\uB85C \uB3CC\uC544\uAC00\uAE30" })] }));
}
