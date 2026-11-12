import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Bot, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { streamAdminChat } from "@/lib/aiChatApi";
import { isAbortError } from "@/lib/apiClient";
import { ChatMessageBody } from "@/layouts/ChatMessageBody";
export function AiChatWidget() {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState("");
    const [messages, setMessages] = useState([]);
    const nextId = useRef(1);
    const listRef = useRef(null);
    const draftRef = useRef("");
    const abortRef = useRef(null);
    function changeDraft(value) {
        draftRef.current = value;
        setDraft(value);
    }
    useEffect(() => () => abortRef.current?.abort(), []);
    useEffect(() => {
        const list = listRef.current;
        if (list !== null) {
            list.scrollTop = list.scrollHeight;
        }
    }, [messages, open]);
    useEffect(() => {
        if (!open) {
            return;
        }
        function onKeyDown(event) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);
    async function send() {
        const text = draftRef.current.trim();
        if (text === "")
            return;
        const userId = nextId.current;
        const assistantId = nextId.current + 1;
        nextId.current += 2;
        setMessages((current) => [
            ...current,
            { id: userId, role: "user", text },
            { id: assistantId, role: "assistant", text: "" },
        ]);
        draftRef.current = "";
        setDraft("");
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        try {
            await streamAdminChat(text, (chunk) => {
                setMessages((current) => current.map((message) => (message.id === assistantId ? { ...message, text: message.text + chunk } : message)));
            }, controller.signal);
        }
        catch (cause) {
            if (isAbortError(cause)) {
                setMessages((current) => current.filter((item) => item.id !== assistantId || item.text !== ""));
                return;
            }
            const message = cause instanceof Error ? cause.message : "답변을 받지 못했습니다.";
            setMessages((current) => current.map((item) => (item.id === assistantId && item.text === "" ? { ...item, text: message } : item)));
        }
    }
    return (_jsxs(_Fragment, { children: [open && (_jsxs("section", { role: "dialog", "aria-label": "AI \uCC57\uBD07", className: "fixed right-5 bottom-20 z-40 flex h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2.5rem))] flex-col rounded-2xl border border-neutral-200 bg-white shadow-xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-neutral-200 px-4 py-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-neutral-900", children: "AI \uCC57\uBD07" }), _jsx("p", { className: "text-xs text-neutral-500", children: "\uAD00\uB9AC\uC790 \uD1B5\uACC4 \uB3C4\uC6B0\uBBF8" })] }), _jsx("button", { type: "button", "aria-label": "AI \uCC57\uBD07 \uB2EB\uAE30", className: "rounded-lg p-1 text-neutral-500 hover:bg-neutral-100", onClick: () => setOpen(false), children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { ref: listRef, className: "flex-1 space-y-3 overflow-y-auto px-4 py-3", children: [messages.length === 0 && (_jsx("p", { className: "text-sm text-neutral-500", children: "\uC218\uB9AC, \uACB0\uC81C, \uBC30\uC1A1 \uD1B5\uACC4\uB97C \uBB3C\uC5B4\uBCF4\uC138\uC694." })), messages.map((message) => (_jsx(ChatMessageBody, { role: message.role, text: message.text }, message.id)))] }), _jsxs("form", { className: "flex items-center gap-2 border-t border-neutral-200 p-3", onSubmit: (event) => {
                            event.preventDefault();
                            void send();
                        }, children: [_jsx(TextField, { value: draft, onChange: changeDraft, placeholder: "\uD1B5\uACC4\uB97C \uBB3C\uC5B4\uBCF4\uC138\uC694", className: "min-w-0 flex-1" }), _jsx(Button, { type: "submit", disabled: draft.trim() === "", children: "\uC804\uC1A1" })] })] })), _jsx("button", { type: "button", "aria-expanded": open, "aria-label": open ? "AI 챗봇 닫기" : "AI 챗봇 열기", className: "fixed right-5 bottom-5 z-40 grid size-12 place-items-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700", onClick: () => setOpen((value) => !value), children: open ? _jsx(X, { className: "size-5" }) : _jsx(Bot, { className: "size-5" }) })] }));
}
