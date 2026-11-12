import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { useHydratedSession } from "@/hooks/useHydratedSession";
import { loginWithPassword } from "@/lib/authApi";
import { useSessionStore } from "@/stores/useSessionStore";
const demoAccounts = [
    { role: "기사", email: "technician001@fixgo.com" },
    { role: "접수", email: "receptionist001@fixgo.com" },
    { role: "관리자", email: "admin001@fixgo.com" },
];
const demoPassword = "password123";
export function LoginPage() {
    const { user, ready } = useHydratedSession();
    const loginWithApi = useSessionStore((state) => state.loginWithApi);
    const navigate = useNavigate();
    const [loginId, setLoginId] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [pending, setPending] = useState(false);
    if (!ready) {
        return null;
    }
    if (user !== null) {
        return _jsx(Navigate, { to: "/as/list", replace: true });
    }
    async function submit() {
        const id = loginId.trim();
        if (id === "" || password.trim() === "") {
            setError("아이디와 비밀번호를 입력해 주세요.");
            return;
        }
        setPending(true);
        setError("");
        try {
            const session = await loginWithPassword(id, password);
            loginWithApi(session.user, session.accessToken, session.refreshToken, session.memberId);
            navigate("/as/list");
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "로그인에 실패했습니다.");
        }
        finally {
            setPending(false);
        }
    }
    return (_jsx("div", { className: "grid min-h-screen place-items-center bg-neutral-50 px-4 py-10", children: _jsx("div", { className: "w-full max-w-md", children: _jsxs("div", { className: "rounded-2xl border border-neutral-200 bg-white px-8 py-10 shadow-sm", children: [_jsx("div", { className: "mx-auto grid size-12 place-items-center rounded-2xl bg-blue-600 text-lg font-bold text-white", children: "F" }), _jsx("h1", { className: "mt-4 text-center text-3xl font-semibold tracking-tight text-blue-600", children: "FixGo" }), _jsx("p", { className: "mt-3 text-center text-xl", children: "\uB85C\uADF8\uC778" }), _jsxs("p", { className: "mt-3 text-center text-sm leading-6 text-neutral-500", children: ["\uBCF8 \uC2DC\uC2A4\uD15C\uC740 FixGo A/S \uAD00\uB9AC \uC9C1\uC6D0 \uC804\uC6A9 \uC11C\uBE44\uC2A4\uC785\uB2C8\uB2E4.", _jsx("br", {}), "\uC544\uC774\uB514\uC640 \uBE44\uBC00\uBC88\uD638\uB97C \uD655\uC778 \uD6C4 \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694."] }), _jsxs("form", { className: "mt-8 space-y-4", onSubmit: (event) => {
                            event.preventDefault();
                            void submit();
                        }, children: [_jsx(TextField, { label: "\uC544\uC774\uB514", value: loginId, onChange: setLoginId, placeholder: "\uC774\uBA54\uC77C" }), _jsx(TextField, { label: "\uBE44\uBC00\uBC88\uD638", type: "password", value: password, onChange: setPassword }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsx(Button, { type: "submit", className: "w-full py-2.5", disabled: pending, children: pending ? "로그인 중" : "로그인" })] }), _jsxs("div", { className: "mt-6 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm", children: [_jsx("p", { className: "font-medium text-neutral-800", children: "\uD14C\uC2A4\uD2B8 \uACC4\uC815" }), _jsxs("p", { className: "mt-1 text-neutral-500", children: ["\uBE44\uBC00\uBC88\uD638 ", demoPassword] }), _jsx("ul", { className: "mt-2 space-y-1", children: demoAccounts.map((account) => (_jsx("li", { children: _jsxs("button", { type: "button", className: "text-left text-blue-600 hover:underline", onClick: () => {
                                            setLoginId(account.email);
                                            setPassword(demoPassword);
                                            setError("");
                                        }, children: [account.role, " ", account.email] }) }, account.email))) })] })] }) }) }));
}
