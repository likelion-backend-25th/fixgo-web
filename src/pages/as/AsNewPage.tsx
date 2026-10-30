import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Notice, Panel } from "@/components/ui/Panel";
import { AsLookupModals, type LookupKind } from "@/pages/as/AsLookupModals";

interface AsForm {
  customerName: string;
  phone: string;
  email: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  serial: string;
  productGroup: string;
  modelName: string;
  purchasedAt: string;
  symptom: string;
  symptomDetail: string;
  memo: string;
  technician: string;
  receiveMethod: "" | "방문" | "택배";
}

const emptyForm: AsForm = {
  customerName: "",
  phone: "",
  email: "",
  postalCode: "",
  address: "",
  addressDetail: "",
  serial: "",
  productGroup: "",
  modelName: "",
  purchasedAt: "",
  symptom: "",
  symptomDetail: "",
  memo: "",
  technician: "",
  receiveMethod: "",
};

export function AsNewPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<AsForm>(emptyForm);
  const [lookup, setLookup] = useState<LookupKind>(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [tried, setTried] = useState(false);

  function patch(partial: Partial<AsForm>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  function submit() {
    setTried(true);
    if (form.customerName === "" || form.phone === "" || form.postalCode === "" || form.address === "" || form.serial === "" || form.technician === "" || form.receiveMethod === "") {
      setError("표시된 필수 항목을 입력해 주세요.");
      return;
    }
    navigate("/as/details/AS-2026-1201", {
      state: {
        notice: "접수가 등록되었습니다.",
        draft: form,
      },
    });
  }

  const invalid = (value: string) => tried && value.trim() === "";

  return (
    <div className="space-y-4">
      {info !== "" && <Notice>{info}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <Panel
        title="고객정보"
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLookup("customer")}>
              고객정보 조회
            </Button>
            <Button
              onClick={() => {
                if (form.customerName === "" || form.phone === "") {
                  setError("고객명과 연락처를 입력한 뒤 고객을 등록해 주세요.");
                  return;
                }
                setError("");
                setInfo("고객 정보를 등록했습니다.");
              }}
            >
              고객 등록
            </Button>
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-3">
          <TextField label="고객명" value={form.customerName} onChange={(customerName) => patch({ customerName })} invalid={invalid(form.customerName)} />
          <TextField label="연락처" value={form.phone} onChange={(phone) => patch({ phone })} invalid={invalid(form.phone)} />
          <TextField label="이메일" value={form.email} onChange={(email) => patch({ email })} />
          <TextField label="우편번호" value={form.postalCode} onChange={(postalCode) => patch({ postalCode })} invalid={invalid(form.postalCode)} />
          <TextField label="기본 주소" value={form.address} onChange={(address) => patch({ address })} invalid={invalid(form.address)} />
          <div className="flex items-end gap-2">
            <TextField className="flex-1" label="상세 주소" value={form.addressDetail} onChange={(addressDetail) => patch({ addressDetail })} />
            <Button variant="outline" onClick={() => setLookup("post")}>
              우편번호 찾기
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="제품/접수 정보">
        <div className="grid gap-3 md:grid-cols-4">
          <TextField label="시리얼번호" value={form.serial} onChange={(serial) => patch({ serial })} invalid={invalid(form.serial)} />
          <div className="flex items-end">
            <Button variant="outline" onClick={() => setLookup("serial")}>
              시리얼번호 조회
            </Button>
          </div>
          <TextField label="제품군" value={form.productGroup} onChange={(productGroup) => patch({ productGroup })} readOnly />
          <TextField label="모델명" value={form.modelName} onChange={(modelName) => patch({ modelName })} readOnly />
          <TextField label="구매일" value={form.purchasedAt} onChange={(purchasedAt) => patch({ purchasedAt })} />
          <div className="flex items-end">
            <Button variant="outline" onClick={() => setLookup("ai")}>
              이미지 기반 자동 입력
            </Button>
          </div>
        </div>
      </Panel>

      <Panel title="고장 내용">
        <div className="grid gap-3 md:grid-cols-2">
          <TextField label="고장 증상 요약" value={form.symptom} onChange={(symptom) => patch({ symptom })} />
          <TextArea className="md:row-span-2" label="고장 증상 상세" value={form.symptomDetail} onChange={(symptomDetail) => patch({ symptomDetail })} rows={6} />
          <TextArea label="고객 요청 사항 / 메모" value={form.memo} onChange={(memo) => patch({ memo })} />
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="담당 A/S기사 배정">
          <div className="flex items-end gap-2">
            <TextField className="flex-1" label="담당 기사" value={form.technician} onChange={(technician) => patch({ technician })} invalid={invalid(form.technician)} readOnly />
            <Button variant="outline" onClick={() => setLookup("tech")}>
              A/S 기사 목록 조회
            </Button>
          </div>
        </Panel>
        <Panel title="수령 방식">
          <div className="flex h-full items-center justify-center gap-6 text-sm">
            {(["방문", "택배"] as const).map((method) => (
              <label key={method} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="receive"
                  checked={form.receiveMethod === method}
                  onChange={() => patch({ receiveMethod: method })}
                />
                {method}
              </label>
            ))}
          </div>
        </Panel>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate("/as/list")}>
          취소
        </Button>
        <Button onClick={submit}>접수</Button>
      </div>
      <AsLookupModals kind={lookup} onClose={() => setLookup(null)} onApply={patch} />
    </div>
  );
}
