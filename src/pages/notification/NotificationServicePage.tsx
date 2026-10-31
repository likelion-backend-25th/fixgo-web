import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { emailRecords } from "@/mocks/screenData";

interface EmailTemplate {
  title: string;
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

  function send() {
    if (!isEmail(email) || subject.trim() === "" || body.trim() === "") {
      setError("수신 이메일, 제목, 본문을 확인해 주세요.");
      setNotice("");
      return;
    }
    setError("");
    setNotice("이메일을 발송했습니다.");
  }

  function registerTemplate() {
    if (subject.trim() === "" || body.trim() === "") {
      setError("등록할 이메일 제목과 본문을 입력해 주세요.");
      setNotice("");
      return;
    }
    const title = subject.replace(/^\[FixGo\]\s*/, "").trim();
    setTemplates((current) => [...current, { title, subject: subject.trim(), body }]);
    setSelected(title);
    setError("");
    setNotice("이메일 템플릿을 등록했습니다.");
  }

  const counts = countEmails();

  return (
    <div>
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Kpi label="오늘 발송" value={`${counts.today}건`} />
        <Kpi label="발송 성공" value={`${counts.success}건`} />
        <Kpi label="발송 실패" value={`${counts.failed}건`} />
      </div>
      {notice !== "" && <Notice>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">이메일 작성</h2>
        <Button onClick={registerTemplate}>등록</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <TextField label="수신 이메일" value={email} onChange={setEmail} />
          <TextField label="이메일 제목" value={subject} onChange={setSubject} />
          <TextArea label="이메일 본문" value={body} onChange={setBody} rows={8} />
          <div className="flex justify-end">
            <Button onClick={send}>발송</Button>
          </div>
        </div>
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.title}
              className={`flex items-center justify-between rounded border px-4 py-4 ${selected === template.title ? "border-blue-500" : "border-neutral-300"}`}
            >
              <span className="text-sm">{template.title}</span>
              <Button
                variant="outline"
                onClick={() => {
                  setSelected(template.title);
                  setSubject(template.subject);
                  setBody(template.body);
                }}
              >
                적용
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-300 p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-blue-600">{value}</p>
    </div>
  );
}
