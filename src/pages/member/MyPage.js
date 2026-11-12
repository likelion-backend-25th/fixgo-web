import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { changeMyPassword, confirmCurrentPassword, logoutFromServer } from "@/lib/authApi";
import { ROLE_LABEL } from "@/types/staff";
import { useSessionStore } from "@/stores/useSessionStore";
export function MyPage() {
    const user = useSessionStore((state) => state.user);
    const [open, setOpen] = useState(false);
    if (user === null) {
        return null;
    }
    return (_jsxs("div", { children: [_jsx("section", { className: "max-w-4xl rounded-xl border border-neutral-200 bg-white p-5 shadow-sm", children: _jsxs("div", { className: "flex flex-wrap gap-8", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("span", { className: "grid size-16 place-items-center rounded-full bg-blue-600 text-xl font-semibold text-white", children: user.name.slice(0, 1) }), _jsxs("div", { children: [_jsx("p", { className: "text-lg font-semibold", children: user.name }), _jsx("p", { className: "text-sm text-neutral-500", children: ROLE_LABEL[user.role] }), _jsx("p", { className: "text-sm text-neutral-500", children: user.workStatus })] })] }), _jsxs("dl", { className: "grid gap-3 text-sm sm:grid-cols-[80px_1fr]", children: [_jsx("dt", { className: "text-neutral-500", children: "\uC5F0\uB77D\uCC98" }), _jsx("dd", { children: user.phone }), _jsx("dt", { className: "text-neutral-500", children: "\uC774\uBA54\uC77C" }), _jsx("dd", { children: user.email }), _jsx("dt", { className: "text-neutral-500", children: "\uC8FC\uC18C" }), _jsx("dd", { className: "whitespace-pre-line", children: user.address })] })] }) }), _jsx(Button, { variant: "outline", className: "mt-4", onClick: () => setOpen(true), children: "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD" }), open && _jsx(PasswordModal, { onClose: () => setOpen(false) })] }));
}
function PasswordModal({ onClose }) {
    const user = useSessionStore((state) => state.user);
    const accessToken = useSessionStore((state) => state.accessToken);
    const navigate = useNavigate();
    const [currentPassword, setCurrentPassword] = useState("");
    const [nextPassword, setNextPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);
    const [saving, setSaving] = useState(false);
    async function submit() {
        if (user === null || accessToken === null) {
            setError("직원 이메일로 로그인한 뒤에 비밀번호를 변경할 수 있습니다.");
            return;
        }
        if (currentPassword === "") {
            setError("기존 비밀번호를 입력해 주세요.");
            return;
        }
        if (nextPassword.length < 4) {
            setError("새 비밀번호는 4자 이상이어야 합니다.");
            return;
        }
        if (nextPassword !== confirmPassword) {
            setError("새 비밀번호 확인이 일치하지 않습니다.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await confirmCurrentPassword(user.email, currentPassword);
            await changeMyPassword(user.email, nextPassword);
            setDone(true);
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "비밀번호를 변경하지 못했습니다.");
            setSaving(false);
        }
    }
    return (_jsx(Modal, { title: "\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD", onClose: onClose, children: done ? (_jsxs("div", { className: "space-y-4", children: [_jsx(Notice, { children: "\uBE44\uBC00\uBC88\uD638\uAC00 \uBCC0\uACBD\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uB85C\uADF8\uC778\uD574 \uC8FC\uC138\uC694." }), _jsx("div", { className: "flex justify-end", children: _jsx(Button, { onClick: () => {
                            void logoutFromServer();
                            navigate("/login");
                        }, children: "\uD655\uC778" }) })] })) : (_jsxs("form", { className: "space-y-3", onSubmit: (event) => {
                event.preventDefault();
                void submit();
            }, children: [_jsx(TextField, { label: "\uAE30\uC874 \uBE44\uBC00\uBC88\uD638", type: "password", value: currentPassword, onChange: setCurrentPassword }), _jsx(TextField, { label: "\uC0C8 \uBE44\uBC00\uBC88\uD638", type: "password", value: nextPassword, onChange: setNextPassword }), _jsx(TextField, { label: "\uC0C8 \uBE44\uBC00\uBC88\uD638 \uD655\uC778", type: "password", value: confirmPassword, onChange: setConfirmPassword }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: onClose, children: "\uCDE8\uC18C" }), _jsx(Button, { type: "submit", disabled: saving, children: "\uBCC0\uACBD" })] })] })) }));
}
