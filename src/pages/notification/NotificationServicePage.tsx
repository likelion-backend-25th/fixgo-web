import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { createEmailPreset, deleteEmailPreset, fetchEmailPresets, updateEmailPreset, type EmailPreset } from "@/lib/emailPresetApi";
import { fetchEmailStatistics, sendNotificationEmail, type NotificationType } from "@/lib/notificationApi";

interface EmailTemplate {
  id: number;
  title: string;
  subject: string;
  body: string;
}

interface PresetForm {
  title: string;
  subject: string;
  body: string;
}

function toTemplate(preset: EmailPreset): EmailTemplate {
  return {
    id: preset.id,
    title: preset.name,
    subject: preset.messageTitle,
    body: preset.message,
  };
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

// 발송 API는 알림 유형이 필수다. 화면에는 유형 칸이 없어 선택한 프리셋과 제목으로 맞춘다.
function notificationTypeOf(title: string, subject: string): NotificationType {
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
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [presetOpen, setPresetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
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
      .catch((cause: unknown) => {
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
      .catch((cause: unknown) => {
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
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "이메일 발송에 실패했습니다.");
    } finally {
      setSending(false);
      setStatsVersion((current) => current + 1);
    }
  }

  async function savePreset(preset: PresetForm) {
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

  async function updatePreset(preset: PresetForm) {
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

  async function deleteTemplate(id: number) {
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
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "이메일 프리셋 삭제에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  const editing = templates.find((item) => item.id === editingId);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="오늘 발송" value={`${counts.total}건`} />
        <Kpi label="발송 성공" value={`${counts.success}건`} />
        <Kpi label="발송 실패" value={`${counts.failed}건`} />
      </div>
      {statsError !== "" && <Notice tone="error">{statsError}</Notice>}
      {notice !== "" && <Notice transient onDismiss={() => setNotice("")}>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="section-title mb-4">이메일 작성</h2>
          <div className="space-y-4">
            <TextField label="수신 이메일" value={email} onChange={setEmail} />
            <TextField label="제목" value={subject} onChange={setSubject} />
            <TextArea label="본문" value={body} onChange={setBody} rows={8} />
          </div>
          <div className="mt-4 flex justify-end border-t border-neutral-100 pt-4">
            <Button disabled={sending} onClick={() => void send()}>발송</Button>
          </div>
        </section>
        <section className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-end border-b border-neutral-100 px-4 py-3">
            <Button onClick={() => setPresetOpen(true)}>등록</Button>
          </div>
          <ul className="email-preset-list min-h-0 flex-1">
            {presetsLoading && <li className="email-preset-item text-sm text-neutral-500">프리셋을 불러오는 중입니다.</li>}
            {!presetsLoading && templates.length === 0 && (
              <li className="email-preset-item text-sm text-neutral-500">등록된 프리셋이 없습니다.</li>
            )}
            {templates.map((template) => {
              const active = selectedId === template.id;
              return (
                <li key={template.id} className={cn("email-preset-item", active && "is-selected")}>
                  <span className={cn("min-w-0 truncate text-sm", active && "font-medium text-blue-600")}>{template.title}</span>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedId(template.id);
                        setSubject(template.subject);
                        setBody(template.body);
                      }}
                    >
                      적용
                    </Button>
                    <PresetMoreMenu
                      deleting={deletingId === template.id}
                      onEdit={() => setEditingId(template.id)}
                      onDelete={() => void deleteTemplate(template.id)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      {presetOpen && <SmsPresetModal onClose={() => setPresetOpen(false)} onSave={savePreset} />}
      {editing !== undefined && (
        <SmsPresetModal
          modalTitle="SMS 프리셋 수정"
          initial={editing}
          onClose={() => setEditingId(null)}
          onSave={updatePreset}
        />
      )}
    </div>
  );
}

function PresetMoreMenu({
  deleting,
  onEdit,
  onDelete,
}: {
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, upward: false });

  useEffect(() => {
    if (!open) {
      return;
    }
    function close(event: Event) {
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

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="더보기"
        aria-expanded={open}
        className="grid size-8 place-items-center rounded-lg text-lg leading-none text-neutral-500 hover:bg-neutral-100"
        onClick={toggle}
      >
        ⋯
      </button>
      {open && (
        <div
          ref={menuRef}
          className="fixed z-50 w-28 overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-md"
          style={{ top: position.top, left: position.left, transform: position.upward ? "translate(-100%, -100%)" : "translateX(-100%)" }}
        >
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-neutral-800 hover:bg-neutral-50"
            onClick={() => {
              setOpen(false);
              onEdit();
            }}
          >
            수정
          </button>
          <button
            type="button"
            disabled={deleting}
            className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
          >
            삭제
          </button>
        </div>
      )}
    </>
  );
}

function SmsPresetModal({
  modalTitle = "SMS 프리셋 등록",
  initial,
  onClose,
  onSave,
}: {
  modalTitle?: string;
  initial?: PresetForm;
  onClose: () => void;
  onSave: (preset: PresetForm) => Promise<void>;
}) {
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
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "이메일 프리셋 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={modalTitle} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <TextField label="프리셋 제목" value={title} onChange={setTitle} />
        <TextField label="제목" value={subject} onChange={setSubject} />
        <TextArea label="본문" value={body} onChange={setBody} rows={6} />
        {error !== "" && <Notice tone="error">{error}</Notice>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>취소</Button>
          <Button disabled={saving} type="submit">저장</Button>
        </div>
      </form>
    </Modal>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-blue-600">{value}</p>
    </div>
  );
}
