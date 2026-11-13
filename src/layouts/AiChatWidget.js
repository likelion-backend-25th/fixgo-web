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
    const [position, setPosition] = useState(() => readChatPosition());
    const [size, setSize] = useState(() => readChatSize());
    const nextId = useRef(1);
    const listRef = useRef(null);
    const draftRef = useRef("");
    const abortRef = useRef(null);
    const dragRef = useRef(null);
    const resizeRef = useRef(null);
    function changeDraft(value) {
        draftRef.current = value;
        setDraft(value);
    }
    useEffect(() => () => abortRef.current?.abort(), []);
    useEffect(() => {
        function onResize() {
            setPosition((current) => clampChatPosition(current));
        }
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);
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
    function onPointerDown(event) {
        if (event.button !== 0) {
            return;
        }
        dragRef.current = {
            pointerId: event.pointerId,
            originX: event.clientX,
            originY: event.clientY,
            startX: position.x,
            startY: position.y,
            moved: false,
        };
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
        window.addEventListener("pointercancel", onPointerUp);
    }
    function onPointerMove(event) {
        const drag = dragRef.current;
        if (drag === null || drag.pointerId !== event.pointerId) {
            return;
        }
        const dx = event.clientX - drag.originX;
        const dy = event.clientY - drag.originY;
        if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
            return;
        }
        drag.moved = true;
        setPosition(clampChatPosition({ x: drag.startX + dx, y: drag.startY + dy }));
    }
    function onPointerUp(event) {
        const drag = dragRef.current;
        if (drag === null || drag.pointerId !== event.pointerId) {
            return;
        }
        dragRef.current = null;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
        if (drag.moved) {
            const next = clampChatPosition({
                x: drag.startX + (event.clientX - drag.originX),
                y: drag.startY + (event.clientY - drag.originY),
            });
            setPosition(next);
            saveChatPosition(next);
            return;
        }
        setOpen((value) => !value);
    }
    function onResizePointerDown(event) {
        if (event.button !== 0) {
            return;
        }
        event.stopPropagation();
        const box = chatPanelStyle(position, size);
        resizeRef.current = {
            pointerId: event.pointerId,
            originX: event.clientX,
            originY: event.clientY,
            startWidth: box.width,
            startHeight: box.height,
            placeAbove: box.placeAbove,
        };
        window.addEventListener("pointermove", onResizePointerMove);
        window.addEventListener("pointerup", onResizePointerUp);
        window.addEventListener("pointercancel", onResizePointerUp);
    }
    function onResizePointerMove(event) {
        const resize = resizeRef.current;
        if (resize === null || resize.pointerId !== event.pointerId) {
            return;
        }
        // 오른쪽은 버튼에 고정이라, 왼쪽·바깥쪽으로 끌수록 커진다.
        const next = clampChatSize({
            width: resize.startWidth - (event.clientX - resize.originX),
            height: resize.placeAbove
                ? resize.startHeight - (event.clientY - resize.originY)
                : resize.startHeight + (event.clientY - resize.originY),
        }, position);
        setSize(next);
    }
    function onResizePointerUp(event) {
        const resize = resizeRef.current;
        if (resize === null || resize.pointerId !== event.pointerId) {
            return;
        }
        resizeRef.current = null;
        window.removeEventListener("pointermove", onResizePointerMove);
        window.removeEventListener("pointerup", onResizePointerUp);
        window.removeEventListener("pointercancel", onResizePointerUp);
        const next = clampChatSize({
            width: resize.startWidth - (event.clientX - resize.originX),
            height: resize.placeAbove
                ? resize.startHeight - (event.clientY - resize.originY)
                : resize.startHeight + (event.clientY - resize.originY),
        }, position);
        setSize(next);
        saveChatSize(next);
    }
    const panel = chatPanelStyle(position, size);
    return (_jsxs(_Fragment, { children: [open && (_jsxs("section", { role: "dialog", "aria-label": "AI \uCC57\uBD07", className: "fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl", style: { left: panel.left, top: panel.top, width: panel.width, height: panel.height }, children: [_jsx("button", { type: "button", "aria-label": "\uCC57\uBD07 \uD06C\uAE30 \uC870\uC808", title: "\uB04C\uC5B4\uC11C \uD06C\uAE30 \uC870\uC808", className: `absolute z-10 size-6 touch-none text-neutral-400 hover:text-neutral-600 ${panel.placeAbove ? "top-1.5 left-1.5 cursor-nwse-resize" : "bottom-1.5 left-1.5 cursor-nesw-resize"}`, onPointerDown: onResizePointerDown, children: _jsx(ResizeGrip, { above: panel.placeAbove }) }), _jsxs("div", { className: `flex items-center justify-between border-b border-neutral-200 py-3 pr-4 ${panel.placeAbove ? "pl-8" : "pl-4"}`, children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold text-neutral-900", children: "AI \uCC57\uBD07" }), _jsx("p", { className: "text-xs text-neutral-500", children: "\uAD00\uB9AC\uC790 \uD1B5\uACC4 \uB3C4\uC6B0\uBBF8" })] }), _jsx("button", { type: "button", "aria-label": "AI \uCC57\uBD07 \uB2EB\uAE30", className: "rounded-lg p-1 text-neutral-500 hover:bg-neutral-100", onClick: () => setOpen(false), children: _jsx(X, { className: "size-4" }) })] }), _jsxs("div", { ref: listRef, className: "flex-1 space-y-3 overflow-y-auto px-4 py-3", children: [messages.length === 0 && (_jsx("p", { className: "text-sm text-neutral-500", children: "\uC218\uB9AC, \uACB0\uC81C, \uBC30\uC1A1 \uD1B5\uACC4\uB97C \uBB3C\uC5B4\uBCF4\uC138\uC694." })), messages.map((message) => (_jsx(ChatMessageBody, { role: message.role, text: message.text }, message.id)))] }), _jsxs("form", { className: `flex items-center gap-2 border-t border-neutral-200 py-3 pr-3 ${panel.placeAbove ? "pl-3" : "pl-8"}`, onSubmit: (event) => {
                            event.preventDefault();
                            void send();
                        }, children: [_jsx(TextField, { value: draft, onChange: changeDraft, placeholder: "\uD1B5\uACC4\uB97C \uBB3C\uC5B4\uBCF4\uC138\uC694", className: "min-w-0 flex-1" }), _jsx(Button, { type: "submit", disabled: draft.trim() === "", children: "\uC804\uC1A1" })] })] })), _jsx("button", { type: "button", "aria-expanded": open, "aria-label": open ? "AI 챗봇 닫기" : "AI 챗봇 열기", title: "\uB04C\uC5B4\uC11C \uC774\uB3D9", className: "fixed z-40 grid size-12 cursor-grab touch-none place-items-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:cursor-grabbing", style: { left: position.x, top: position.y }, onPointerDown: onPointerDown, children: open ? _jsx(X, { className: "size-5" }) : _jsx(Bot, { className: "size-5" }) })] }));
}
const BUTTON_SIZE = 48;
const VIEW_MARGIN = 20;
const DRAG_THRESHOLD = 4;
const MIN_WIDTH = 280;
const MIN_HEIGHT = 220;
const POSITION_KEY = "fixgo-chat-button";
const SIZE_KEY = "fixgo-chat-size";
function readChatPosition() {
    try {
        const raw = localStorage.getItem(POSITION_KEY);
        if (raw === null) {
            return defaultChatPosition();
        }
        const parsed = JSON.parse(raw);
        if (!isPoint(parsed)) {
            return defaultChatPosition();
        }
        return clampChatPosition(parsed);
    }
    catch {
        return defaultChatPosition();
    }
}
function saveChatPosition(point) {
    localStorage.setItem(POSITION_KEY, JSON.stringify(point));
}
function defaultChatPosition() {
    return clampChatPosition({
        x: window.innerWidth - BUTTON_SIZE - VIEW_MARGIN,
        y: window.innerHeight - BUTTON_SIZE - VIEW_MARGIN,
    });
}
function clampChatPosition(point) {
    const maxX = Math.max(VIEW_MARGIN, window.innerWidth - BUTTON_SIZE - VIEW_MARGIN);
    const maxY = Math.max(VIEW_MARGIN, window.innerHeight - BUTTON_SIZE - VIEW_MARGIN);
    return {
        x: Math.min(Math.max(VIEW_MARGIN, point.x), maxX),
        y: Math.min(Math.max(VIEW_MARGIN, point.y), maxY),
    };
}
function readChatSize() {
    try {
        const raw = localStorage.getItem(SIZE_KEY);
        if (raw === null) {
            return defaultChatSize();
        }
        const parsed = JSON.parse(raw);
        if (!isChatSize(parsed)) {
            return defaultChatSize();
        }
        return parsed;
    }
    catch {
        return defaultChatSize();
    }
}
function saveChatSize(size) {
    localStorage.setItem(SIZE_KEY, JSON.stringify(size));
}
function defaultChatSize() {
    return {
        width: Math.min(384, Math.max(MIN_WIDTH, window.innerWidth - VIEW_MARGIN * 2)),
        height: Math.min(512, Math.max(MIN_HEIGHT, window.innerHeight * 0.7)),
    };
}
function clampChatSize(size, button) {
    const limits = panelLimits(button);
    return {
        width: fitSize(size.width, MIN_WIDTH, limits.maxWidth),
        height: fitSize(size.height, MIN_HEIGHT, limits.maxHeight),
    };
}
function fitSize(value, min, max) {
    const lower = Math.min(min, max);
    return Math.min(Math.max(lower, value), max);
}
function panelLimits(button) {
    const gap = 12;
    const spaceAbove = button.y - VIEW_MARGIN - gap;
    const spaceBelow = window.innerHeight - (button.y + BUTTON_SIZE) - VIEW_MARGIN - gap;
    const placeAbove = spaceAbove >= spaceBelow;
    return {
        maxWidth: Math.max(160, window.innerWidth - VIEW_MARGIN * 2),
        maxHeight: Math.max(160, placeAbove ? spaceAbove : spaceBelow),
        placeAbove,
    };
}
function chatPanelStyle(button, size) {
    const gap = 12;
    const limits = panelLimits(button);
    const fitted = clampChatSize(size, button);
    const top = limits.placeAbove ? button.y - gap - fitted.height : button.y + BUTTON_SIZE + gap;
    const maxLeft = Math.max(VIEW_MARGIN, window.innerWidth - fitted.width - VIEW_MARGIN);
    const left = Math.min(Math.max(VIEW_MARGIN, button.x + BUTTON_SIZE - fitted.width), maxLeft);
    return { left, top, width: fitted.width, height: fitted.height, placeAbove: limits.placeAbove };
}
function ResizeGrip({ above }) {
    return (_jsx("svg", { width: "14", height: "14", viewBox: "0 0 14 14", "aria-hidden": true, className: above ? "scale-y-[-1]" : undefined, children: _jsx("path", { d: "M2 12 L12 2 M2 8 L8 2 M6 12 L12 6", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round" }) }));
}
function isChatSize(value) {
    return typeof value === "object" && value !== null && typeof value.width === "number" && Number.isFinite(value.width) && typeof value.height === "number" && Number.isFinite(value.height);
}
function isPoint(value) {
    return typeof value === "object" && value !== null && typeof value.x === "number" && Number.isFinite(value.x) && typeof value.y === "number" && Number.isFinite(value.y);
}
