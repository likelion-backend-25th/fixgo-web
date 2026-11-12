import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
export function ConfirmModal({ title, message, confirmLabel = "확인", cancelLabel = "취소", onConfirm, onClose, }) {
    return (_jsxs(Modal, { title: title, onClose: onClose, compact: true, children: [_jsx("p", { className: "text-sm leading-6 text-neutral-700", children: message }), _jsxs("div", { className: "mt-6 flex justify-end gap-2", children: [_jsx(Button, { variant: "outline", onClick: onClose, children: cancelLabel }), _jsx(Button, { onClick: onConfirm, children: confirmLabel })] })] }));
}
