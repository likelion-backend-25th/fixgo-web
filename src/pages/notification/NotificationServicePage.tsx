import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { emailRecords } from "@/mocks/screenData";

interface EmailTemplate {
  title: string;
  email?: string;
  subject: string;
  body: string;
}

const initialTemplates: EmailTemplate[] = [
  {
    title: "접수 완료 안내",
    subject: "[FixGo] A/S 접수 완료 안내",
    body: "고객님의 A/S 접수가 정상적으로 완료되었습니다.\n진행 상황은 안내 링크에서 확인하실 수 있습니다.",
  },
  {
    title: "견적서 발급 완료 안내",
    subject: "[FixGo] 견적서 발급 안내",
    body: "고객님의 견적서가 발급되었습니다.\n고객 포탈에서 수리 진행 여부를 선택해 주세요.",
  },
  {
    title: "수리 완료 및 결제 안내",
    subject: "[FixGo] 수리 완료 안내",
    body: "[FixGo] 고객님의 수리가 완료되었습니다.\n담당 기사: 김기사\n연락처: 010-1234-1234\n결제 확인 후 제품을 수령해 주세요.",
  },
  {
    title: "배송 시작 안내",
    subject: "[FixGo] 배송 시작 안내",
    body: "고객님의 제품 배송이 시작되었습니다.\n운송장번호로 배송 위치를 확인해 주세요.",
  },
];

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function countEmails() {
  const success = emailRecords.filter((row) => row.status === "성공").length;
  const failed = emailRecords.filter((row) => row.status === "실패").length;
  return { today: success + failed, success, failed };
}

export function NotificationServicePage() {
  const [templates, setTemplates] = useState(initialTemplates);
  const [email, setEmail] = useState("user1@exampler.com");
  const [subject, setSubject] = useState(initialTemplates[0]?.subject ?? "");
  const [body, setBody] = useState(initialTemplates[0]?.body ?? "");
  const [selected, setSelected] = useState(initialTemplates[0]?.title ?? "");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [presetOpen, setPresetOpen] = useState(false);

  function send() {
    if (!isEmail(email) || subject.trim() === "" || body.trim() === "") {
      setError("수신 이메일, 제목, 본문을 확인해 주세요.");
      setNotice("");
      return;
    }
    setError("");
    setNotice("이메일을 발송했습니다.");
  }

  function savePreset(preset: EmailTemplate) {
    setTemplates((current) => [...current, preset]);
    setSelected(preset.title);
    setPresetOpen(false);
    setError("");
    setNotice("SMS 프리셋을 저장했습니다.");
  }

  function deleteTemplate(index: number) {
    const target = templates[index];
    if (target === undefined) {
      return;
    }
    setTemplates((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (selected === target.title) {
      setSelected("");
    }
    setError("");
    setNotice("이메일 템플릿을 삭제했습니다.");
  }

  const counts = countEmails();

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="오늘 발송" value={`${counts.today}건`} />
        <Kpi label="발송 성공" value={`${counts.success}건`} />
        <Kpi label="발송 실패" value={`${counts.failed}건`} />
      </div>
      {notice !== "" && <Notice>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_28rem]">
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">이메일 작성</h2>
          <div className="space-y-4">
            <TextField label="수신 이메일" value={email} onChange={setEmail} />
            <TextField label="제목" value={subject} onChange={setSubject} />
            <TextArea label="본문" value={body} onChange={setBody} rows={8} />
          </div>
          <div className="mt-4 flex justify-end border-t border-neutral-100 pt-4">
            <Button onClick={send}>발송</Button>
          </div>
        </section>
        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-end border-b border-neutral-100 px-4 py-3">
            <Button onClick={() => setPresetOpen(true)}>등록</Button>
          </div>
          <ul>
            {templates.map((template, index) => {
              const active = selected === template.title;
              return (
                <li
                  key={`${template.title}-${index}`}
                  className={cn(
                    "flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0",
                    active && "bg-blue-50",
                  )}
                >
                  <span className={cn("min-w-0 text-sm", active && "font-medium text-blue-700")}>{template.title}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelected(template.title);
                        if (template.email !== undefined && template.email !== "") {
                          setEmail(template.email);
                        }
                        setSubject(template.subject);
                        setBody(template.body);
                      }}
                    >
                      적용
                    </Button>
                    <Button variant="outline" onClick={() => deleteTemplate(index)}>삭제</Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
      {presetOpen && <SmsPresetModal onClose={() => setPresetOpen(false)} onSave={savePreset} />}
    </div>
  );
}

function SmsPresetModal({ onClose, onSave }: { onClose: () => void; onSave: (preset: EmailTemplate) => void }) {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");

  function submit() {
    if (title.trim() === "" || subject.trim() === "" || body.trim() === "") {
      setError("프리셋 제목, 제목, 본문을 입력해 주세요.");
      return;
    }
    onSave({
      title: title.trim(),
      subject: subject.trim(),
      body,
    });
  }

  return (
    <Modal title="SMS 프리셋 등록" onClose={onClose}>
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
          <Button type="submit">저장</Button>
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
