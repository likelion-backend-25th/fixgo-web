import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Notice, Panel } from "@/components/ui/Panel";
import { updateReception } from "@/lib/asReceptionApi";
import { useSessionStore } from "@/stores/useSessionStore";
import type { AsReceptionDetail, AsReceptionStatus, ReturnMethod } from "@/types/asReception";

const editableStatuses: readonly AsReceptionStatus[] = [
  "RECEIVED",
  "INSPECTION",
  "AWAITING_QUOTE_APPROVAL",
  "AWAITING_REPAIR",
];

interface ReceptionEditPanelProps {
  detail: AsReceptionDetail;
  onSaved: (message: string) => void;
}

export function ReceptionEditPanel({ detail, onSaved }: ReceptionEditPanelProps) {
  const role = useSessionStore((state) => state.user?.role);
  const memberId = useSessionStore((state) => state.memberId);
  const canEdit = role === "ADMIN" || role === "RECEPTIONIST";
  // 직원 번호가 없으면 화면에서 소유자를 가리지 않고, 저장 시 서버가 권한을 판단한다.
  const ownsReception = role === "ADMIN" || memberId === null || detail.receptionist?.id === memberId;
  const statusOpen = editableStatuses.includes(detail.status);
  const [symptom, setSymptom] = useState(detail.symptom);
  const [symptomDetail, setSymptomDetail] = useState(detail.symptomDetail);
  const [memo, setMemo] = useState(detail.memo ?? "");
  const [returnMethod, setReturnMethod] = useState<ReturnMethod>(detail.returnMethod);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setSymptom(detail.symptom);
    setSymptomDetail(detail.symptomDetail);
    setMemo(detail.memo ?? "");
    setReturnMethod(detail.returnMethod);
  }, [detail]);

  if (!canEdit) {
    return null;
  }

  async function save() {
    if (symptom.trim() === "" || symptomDetail.trim() === "") {
      setError("고장 증상 요약과 상세를 입력해 주세요.");
      return;
    }
    if (symptom.trim().length > 255 || symptomDetail.trim().length > 255) {
      setError("고장 증상 요약과 상세는 255자까지 입력할 수 있습니다.");
      return;
    }
    if (memo.trim().length > 1000) {
      setError("메모는 1000자까지 입력할 수 있습니다.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await updateReception(detail.id, { symptom, symptomDetail, memo, returnMethod });
      onSaved("접수 정보를 수정했습니다.");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "접수 정보를 수정하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel
      title="접수 수정"
      action={statusOpen && ownsReception ? <Button onClick={() => void save()} disabled={pending}>수정</Button> : undefined}
    >
      {error !== "" && <Notice tone="error">{error}</Notice>}
      {!statusOpen && <p className="text-sm text-neutral-500">수리 시작 전 접수만 수정할 수 있습니다.</p>}
      {statusOpen && !ownsReception && <p className="text-sm text-neutral-500">해당 건을 등록한 접수 담당자만 수정할 수 있습니다.</p>}
      {statusOpen && ownsReception && (
        <div className="grid items-end gap-3 md:grid-cols-2">
          <TextField label="고장 증상 요약" value={symptom} onChange={setSymptom} />
          <div className="flex h-10 items-center justify-center gap-6 text-sm">
            <span className="font-medium text-neutral-600">수령 방식</span>
            {(["방문", "택배"] as const).map((label) => {
              const method: ReturnMethod = label === "방문" ? "PICKUP" : "DELIVERY";
              return (
                <label key={method} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="edit-return-method"
                    checked={returnMethod === method}
                    onChange={() => setReturnMethod(method)}
                  />
                  {label}
                </label>
              );
            })}
          </div>
          <TextArea label="고장 증상 상세" value={symptomDetail} onChange={setSymptomDetail} rows={4} />
          <TextArea label="고객 요청 사항 / 메모" value={memo} onChange={setMemo} rows={4} />
        </div>
      )}
    </Panel>
  );
}
