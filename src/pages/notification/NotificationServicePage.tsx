import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";

const templates = [
  { title: "접수 완료 안내", body: "[사자전자] AS-2026-1112 접수가 완료되었습니다.\n진행 상황은 안내 링크에서 확인할 수 있습니다." },
  { title: "견적서 발급 완료 안내", body: "[사자전자] 견적서가 발급되었습니다. 고객 포탈에서 수리 진행 여부를 선택해 주세요." },
  { title: "수리 완료 및 결제 안내", body: "[사자전자] 수리가 완료되었습니다. 결제 후 제품을 찾아가실 수 있습니다." },
  { title: "배송 시작 안내", body: "[사자전자] 제품 배송이 시작되었습니다. 운송장번호로 위치를 확인해 주세요." },
];

export function NotificationServicePage() {
  const [phone, setPhone] = useState("010-5555-1212");
  const [body, setBody] = useState(templates[0]?.body ?? "");
  const [selected, setSelected] = useState(templates[0]?.title ?? "");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  return (
    <div>
      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <Kpi label="오늘 발송" value="12건" />
        <Kpi label="발송 성공" value="10건" />
        <Kpi label="발송 실패" value="2건" />
      </div>
      {notice !== "" && <Notice>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">메시지 발송</h2>
        <Button
          onClick={() => {
            if (!/^010-\d{4}-\d{4}$/.test(phone) || body.trim() === "") {
              setError("휴대폰 번호와 메시지 내용을 확인해 주세요.");
              setNotice("");
              return;
            }
            setError("");
            setNotice("메시지를 발송했습니다.");
          }}
        >
          발송하기
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <TextField label="고객 번호" value={phone} onChange={setPhone} />
          <TextArea label="내용" value={body} onChange={setBody} rows={12} />
        </div>
        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.title} className={`flex items-center justify-between rounded border px-4 py-4 ${selected === template.title ? "border-blue-500" : "border-neutral-300"}`}>
              <span className="text-sm">{template.title}</span>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelected(template.title);
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
