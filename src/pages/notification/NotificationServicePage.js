import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { createEmailPreset, deleteEmailPreset, fetchEmailPresets, updateEmailPreset } from "@/lib/emailPresetApi";
import { fetchEmailStatistics, sendNotificationEmail } from "@/lib/notificationApi";
function toTemplate(preset) {
    return {
        id: preset.id,
        title: preset.name,
        subject: preset.messageTitle,
        body: preset.message,
    };
}
function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
// 발송 API는 알림 유형이 필수다. 화면에는 유형 칸이 없어 선택한 프리셋과 제목으로 맞춘다.
function notificationTypeOf(title, subject) {
    const text = `${title} ${subject}`;
    if (text.includes("배송")) {
        return "SHIPPING";
    }
    if (text.includes("견적")) {
        return "ESTIMATE";
    }
    if (text.includes("수리")) {
        return "REPAIR";
    }
    if (text.includes("결제")) {
        return "PAYMENT";
    }
    return "RECEIVED";
}
export function NotificationServicePage() {
    const [templates, setTemplates] = useState([]);
    const [presetsLoading, setPresetsLoading] = useState(true);
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");
    const [selectedId, setSelectedId] = useState(null);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const [presetOpen, setPresetOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deletingId, setDeletingId] = useState(null);
    const [sending, setSending] = useState(false);
    const [counts, setCounts] = useState({ total: 0, success: 0, failed: 0 });
    const [statsVersion, setStatsVersion] = useState(0);
    const [statsError, setStatsError] = useState("");
    useEffect(() => {
        const controller = new AbortController();
        fetchEmailStatistics(controller.signal)
            .then((stats) => {
            setCounts(stats);
            setStatsError("");
        })
            .catch((cause) => {
            if (cause instanceof DOMException && cause.name === "AbortError") {
                return;
            }
            setStatsError(cause instanceof Error ? cause.message : "이메일 발송 통계를 불러오지 못했습니다.");
        });
        return () => controller.abort();
    }, [statsVersion]);
    useEffect(() => {
        const controller = new AbortController();
        fetchEmailPresets(controller.signal)
            .then((presets) => {
            setTemplates(presets.map(toTemplate));
            setError("");
        })
            .catch((cause) => {
            if (cause instanceof DOMException && cause.name === "AbortError") {
                return;
            }
            setError(cause instanceof Error ? cause.message : "이메일 프리셋 목록을 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setPresetsLoading(false);
            }
        });
        return () => controller.abort();
    }, []);
    async function send() {
        if (sending) {
            return;
        }
        if (!isEmail(email) || subject.trim() === "" || body.trim() === "") {
            setError("수신 이메일, 제목, 본문을 확인해 주세요.");
            setNotice("");
            return;
        }
        setSending(true);
        setError("");
        setNotice("");
        try {
            const result = await sendNotificationEmail({
                recipientEmail: email.trim(),
                messageTitle: subject.trim(),
                message: body,
                notificationType: notificationTypeOf(templates.find((item) => item.id === selectedId)?.title ?? "", subject),
            });
            if (result.status === "FAILED") {
                setError("이메일 발송에 실패했습니다.");
                return;
            }
            setNotice("이메일을 발송했습니다.");
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "이메일 발송에 실패했습니다.");
        }
        finally {
            setSending(false);
            setStatsVersion((current) => current + 1);
        }
    }
    async function savePreset(preset) {
        const created = await createEmailPreset({
            name: preset.title,
            messageTitle: preset.subject,
            message: preset.body,
        });
        const next = toTemplate(created);
        setTemplates((current) => [...current, next]);
        setSelectedId(next.id);
        setPresetOpen(false);
        setError("");
        setNotice("SMS 프리셋을 저장했습니다.");
    }
    async function updatePreset(preset) {
        if (editingId === null) {
            return;
        }
        const updated = await updateEmailPreset(editingId, {
            name: preset.title,
            messageTitle: preset.subject,
            message: preset.body,
        });
        const next = toTemplate(updated);
        setTemplates((current) => current.map((item) => (item.id === next.id ? next : item)));
        setEditingId(null);
        setError("");
        setNotice("SMS 프리셋을 수정했습니다.");
    }
    async function deleteTemplate(id) {
        if (deletingId !== null) {
            return;
        }
        setDeletingId(id);
        setError("");
        setNotice("");
        try {
            await deleteEmailPreset(id);
            setTemplates((current) => current.filter((item) => item.id !== id));
            setSelectedId((current) => (current === id ? null : current));
            setNotice("이메일 템플릿을 삭제했습니다.");
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "이메일 프리셋 삭제에 실패했습니다.");
        }
        finally {
            setDeletingId(null);
        }
    }
    const editing = templates.find((item) => item.id === editingId);
    return (_jsxs("div", { className: "space-y-5", children: [_jsxs("div", { className: "grid gap-3 sm:grid-cols-3", children: [_jsx(Kpi, { label: "\uC624\uB298 \uBC1C\uC1A1", value: `${counts.total}건` }), _jsx(Kpi, { label: "\uBC1C\uC1A1 \uC131\uACF5", value: `${counts.success}건` }), _jsx(Kpi, { label: "\uBC1C\uC1A1 \uC2E4\uD328", value: `${counts.failed}건` })] }), statsError !== "" && _jsx(Notice, { tone: "error", children: statsError }), notice !== "" && _jsx(Notice, { children: notice }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_28rem]", children: [_jsxs("section", { className: "rounded-xl border border-neutral-200 bg-white p-5 shadow-sm", children: [_jsx("h2", { className: "section-title mb-4", children: "\uC774\uBA54\uC77C \uC791\uC131" }), _jsxs("div", { className: "space-y-4", children: [_jsx(TextField, { label: "\uC218\uC2E0 \uC774\uBA54\uC77C", value: email, onChange: setEmail }), _jsx(TextField, { label: "\uC81C\uBAA9", value: subject, onChange: setSubject }), _jsx(TextArea, { label: "\uBCF8\uBB38", value: body, onChange: setBody, rows: 8 })] }), _jsx("div", { className: "mt-4 flex justify-end border-t border-neutral-100 pt-4", children: _jsx(Button, { disabled: sending, onClick: () => void send(), children: "\uBC1C\uC1A1" }) })] }), _jsxs("section", { className: "flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm", children: [_jsx("div", { className: "flex items-center justify-end border-b border-neutral-100 px-4 py-3", children: _jsx(Button, { onClick: () => setPresetOpen(true), children: "등록" }) }), _jsxs("ul", { className: "email-preset-list min-h-0 flex-1", children: [presetsLoading && _jsx("li", { className: "email-preset-item text-sm text-neutral-500", children: "프리셋을 불러오는 중입니다." }), !presetsLoading && templates.length === 0 && _jsx("li", { className: "email-preset-item text-sm text-neutral-500", children: "등록된 프리셋이 없습니다." }), templates.map((template) => {
                                    const active = selectedId === template.id;
                                    return (_jsxs("li", { className: cn("email-preset-item", active && "is-selected"), children: [_jsx("span", { className: cn("min-w-0 truncate text-sm", active && "font-medium text-blue-600"), children: template.title }), _jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [_jsx(Button, { variant: "outline", onClick: () => {
                                                            setSelectedId(template.id);
                                                            setSubject(template.subject);
                                                            setBody(template.body);
                                                        }, children: "적용" }), _jsx(PresetMoreMenu, { deleting: deletingId === template.id, onEdit: () => setEditingId(template.id), onDelete: () => void deleteTemplate(template.id) })] })] }, template.id));
                                })] })] })] }), presetOpen && _jsx(SmsPresetModal, { onClose: () => setPresetOpen(false), onSave: savePreset }), editing !== undefined && (_jsx(SmsPresetModal, { modalTitle: "SMS \uD504\uB9AC\uC14B \uC218\uC815", initial: editing, onClose: () => setEditingId(null), onSave: updatePreset }))] }));
}
function PresetMoreMenu({ deleting, onEdit, onDelete }) {
    const buttonRef = useRef(null);
    const menuRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0, upward: false });
    useEffect(() => {
        if (!open) {
            return;
        }
        function close(event) {
            const target = event.target;
            if (target instanceof Node && (buttonRef.current?.contains(target) || menuRef.current?.contains(target))) {
                return;
            }
            setOpen(false);
        }
        document.addEventListener("mousedown", close);
        window.addEventListener("scroll", close, true);
        return () => {
            document.removeEventListener("mousedown", close);
            window.removeEventListener("scroll", close, true);
        };
    }, [open]);
    function toggle() {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect !== undefined) {
            const upward = rect.bottom + 88 > window.innerHeight;
            setPosition({ top: upward ? rect.top - 4 : rect.bottom + 4, left: rect.right, upward });
        }
        setOpen((current) => !current);
    }
    return (_jsxs(_Fragment, { children: [_jsx("button", { ref: buttonRef, type: "button", "aria-label": "더보기", "aria-expanded": open, className: "grid size-8 place-items-center rounded-lg text-lg leading-none text-neutral-500 hover:bg-neutral-100", onClick: toggle, children: "⋯" }), open && (_jsxs("div", { ref: menuRef, className: "fixed z-50 w-28 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-md", style: { top: position.top, left: position.left, transform: position.upward ? "translate(-100%, -100%)" : "translateX(-100%)" }, children: [_jsx("button", { type: "button", className: "block w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50", onClick: () => {
                        setOpen(false);
                        onEdit();
                    }, children: "수정" }), _jsx("button", { type: "button", disabled: deleting, className: "block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50", onClick: () => {
                        setOpen(false);
                        onDelete();
                    }, children: "삭제" })] }))] }));
}
function SmsPresetModal({ modalTitle = "SMS 프리셋 등록", initial, onClose, onSave, }) {
    const [title, setTitle] = useState(initial?.title ?? "");
    const [subject, setSubject] = useState(initial?.subject ?? "");
    const [body, setBody] = useState(initial?.body ?? "");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    async function submit() {
        if (saving) {
            return;
        }
        if (title.trim() === "" || subject.trim() === "" || body.trim() === "") {
            setError("프리셋 제목, 제목, 본문을 입력해 주세요.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await onSave({
                title: title.trim(),
                subject: subject.trim(),
                body,
            });
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "이메일 프리셋 저장에 실패했습니다.");
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsx(Modal, { title: modalTitle, onClose: onClose, children: _jsxs("form", { className: "space-y-4", onSubmit: (event) => {
                event.preventDefault();
                submit();
            }, children: [_jsx(TextField, { label: "\uD504\uB9AC\uC14B \uC81C\uBAA9", value: title, onChange: setTitle }), _jsx(TextField, { label: "\uC81C\uBAA9", value: subject, onChange: setSubject }), _jsx(TextArea, { label: "\uBCF8\uBB38", value: body, onChange: setBody, rows: 6 }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: onClose, children: "\uCDE8\uC18C" }), _jsx(Button, { disabled: saving, type: "submit", children: "\uC800\uC7A5" })] })] }) }));
}
function Kpi({ label, value }) {
    return (_jsxs("div", { className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", children: [_jsx("p", { className: "text-sm text-neutral-500", children: label }), _jsx("p", { className: "mt-2 text-2xl font-semibold text-blue-600", children: value })] }));
}
