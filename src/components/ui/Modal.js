import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
const modalStack = [];
export function Modal({ title, onClose, children, wide = false, compact = false, className }) {
    const id = useRef(Symbol(title)).current;
    useEffect(() => {
        modalStack.push(id);
        function onKeyDown(event) {
            // 등록 창을 불러오기 창 위에 띄우면, Esc는 맨 위 창만 닫는다.
            if (event.key === "Escape" && modalStack[modalStack.length - 1] === id) {
                onClose();
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => {
            const index = modalStack.lastIndexOf(id);
            if (index >= 0)
                modalStack.splice(index, 1);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [id, onClose]);
    return (_jsx("div", { className: cn("fixed inset-0 z-50 flex justify-center overflow-y-auto bg-neutral-900/40 p-4", compact ? "items-center" : "items-start"), role: "presentation", onClick: onClose, children: _jsxs("div", { role: "dialog", "aria-modal": "true", "aria-label": title, className: cn("w-full rounded-2xl bg-white p-6 shadow-xl", compact ? "my-auto" : "my-8", wide ? "max-w-5xl" : compact ? "max-w-md" : "max-w-lg", className), onClick: (event) => event.stopPropagation(), children: [_jsxs("div", { className: "mb-5 flex items-center justify-between gap-3 border-b border-neutral-100 pb-4", children: [_jsx("h2", { className: "text-base font-semibold tracking-tight", children: title }), _jsx("button", { type: "button", "aria-label": "\uB2EB\uAE30", onClick: onClose, className: "rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800", children: _jsx(X, { className: "size-5" }) })] }), children] }) }));
}
