import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { startMyInspection } from "@/lib/asReceptionApi";
import { calculateRepairCost, confirmRepairCost, createRepairWork, updateRepair } from "@/lib/repair";
import { formatYearMonthDay, won } from "@/lib/format";
import { ReceptionProgress } from "@/pages/as/ReceptionProgress";
import type { AsReceptionDetail, ReceptionRepair } from "@/types/asReception";
import { AsSummary } from "@/pages/as/AsSummary";
import { PresetPickerModal } from "@/pages/as/PresetPickerModal";
import { ProgressTabs } from "@/pages/as/ProgressTabs";
import { useSessionStore } from "@/stores/useSessionStore";
import type { RepairLine } from "@/types/screen";

export function InspectionPage() {
  const isTechnician = useSessionStore((state) => state.user?.role === "TECHNICIAN");
  if (!isTechnician) return <Notice>점검은 담당 기사가 진행할 수 있습니다.</Notice>;

  return (
    <ReceptionProgress render={({ reception, repair }, reload) => (
      repair === null
        ? <InspectionStart record={reception} onStarted={reload} />
        : <InspectionForm key={repair.id} record={reception} repair={repair} onCompleted={reload} />
    )} />
  );
}

function InspectionStart({ record, onStarted }: { record: AsReceptionDetail; onStarted: () => void }) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setStarting(true);
    setError("");
    try {
      await startMyInspection(record.id);
      // 생성 성공 후 상세를 다시 읽어 서버에 저장된 기록으로 화면을 전환한다.
      onStarted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "점검을 시작하지 못했습니다.");
      setStarting(false);
    }
  }

  return (
    <div className="space-y-4">
      <AsSummary record={record} />
      <ProgressTabs receptionId={record.id} current="inspection" />
      {error !== "" && <Notice tone="error">{error}</Notice>}
      {record.status === "RECEIVED" ? (
        <Button disabled={starting} onClick={() => void start()}>
          {starting ? "점검 시작 중…" : "점검 시작"}
        </Button>
      ) : <Notice>조회할 수 있는 점검 기록이 없습니다.</Notice>}
    </div>
  );
}

function InspectionForm({
  record,
  repair,
  onCompleted,
}: {
  record: AsReceptionDetail;
  repair: ReceptionRepair;
  onCompleted: () => void;
}) {
  const [lines, setLines] = useState<RepairLine[]>([]);
  const [note, setNote] = useState(repair.diagnosis ?? "");
  const [judgment, setJudgment] = useState<"무상" | "유상" | null>(
    repair.warrantyResult === "FREE" ? "무상" : repair.warrantyResult === "PAID" ? "유상" : null,
  );
  const [reason, setReason] = useState(repair.reason ?? "");
  const [rejectCategory, setRejectCategory] = useState("");
  const [rejectReason, setRejectReason] = useState(repair.reasonForRejection ?? "");
  const [presetOpen, setPresetOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const diagnosing = repair.status === "DIAGNOSING";

  const laborTotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.amount, 0),
    [lines],
  );
  
  const charge = judgment === "무상" ? 0 : laborTotal;
  const warranty = judgment === "무상" ? laborTotal : 0;

  async function complete() {
    if (note.trim() === "") {
      setNotice("점검 내용을 입력해 주세요.");
      return;
    }
  
    if (judgment === null) {
      setNotice("최종 판정을 선택해 주세요.");
      return;
    }
  
    const technicianId = record.technician?.id;
  
    if (technicianId === undefined) {
      setNotice("담당 기사를 확인할 수 없습니다.");
      return;
    }
  
    setSubmitting(true);
    setNotice("");
  
    try {
      // 1. 점검 내용과 최종 보증 판정 저장
      await updateRepair(repair.id, {
        asReceptionId: record.id,
        technicianId,
        diagnosis: note.trim(),
        workNote: "",
        repairDecision: "REPAIRABLE",
        warrantyResult: judgment === "무상" ? "FREE" : "PAID",
        reason: reason.trim(),
        laborRate: 0,
        inspectionCost: 0,
        finalAmount: 0,
        status: "DIAGNOSING",
        reasonForRejection: rejectReason.trim(),
      });
  
      // 2. 선택한 수리 프리셋을 작업으로 등록
      for (const line of lines) {
        if (line.presetId === undefined) {
          continue;
        }
  
        await createRepairWork({
          repairId: repair.id,
          presetId: line.presetId,
          workName: line.name,
        });
      }
  
      // 3. 백엔드에서 수리 비용 계산
      // 무상(FREE): 부품비, 공임비, 최종 금액 모두 0원
      // 유상(PAID): 등록된 작업 및 부품을 기준으로 비용 계산
      await calculateRepairCost(repair.id);
  
      // 4. 수리 비용 확정
      // 무상(FREE): APPROVED로 바로 전환
      // 유상(PAID): REQUESTED로 전환하여 고객 견적 승인 대기
      await confirmRepairCost(repair.id);
  
      // 5. 최신 서버 데이터로 화면 갱신
      onCompleted();
    } catch (cause: unknown) {
      setNotice(
        cause instanceof Error
          ? cause.message
          : "점검을 완료하지 못했습니다.",
      );
  
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      {notice !== "" && <Notice>{notice}</Notice>}
      <AsSummary record={record} />
      <ProgressTabs receptionId={record.id} current="inspection" />
      {diagnosing ? (
        <Notice>점검 내용을 저장하면 견적 승인 대기로 바뀌고, 이 화면에 그대로 남습니다.</Notice>
      ) : (
        <Notice>{inspectionResultMessage(repair.status)}</Notice>
      )}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">점검 항목</p>
          <Button variant="outline" onClick={() => setPresetOpen(true)}>수리 프리셋</Button>
        </div>
        <LineTable
          lines={lines}
          onRemove={(id) => setLines((current) => current.filter((line) => line.id !== id))}
        />
        <p className="mt-2 text-right text-sm">견적 합계 <span className="ml-6 font-semibold text-blue-700">{won(laborTotal)}</span></p>
      </section>
      <TextArea label="점검 내용" value={note} onChange={setNote} />
      <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm">
        <p className="mb-3 font-medium">보증 판정</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <p>구매일 {formatYearMonthDay(record.product.purchasedAt)}</p>
          <p>보증 판정 미확인</p>
        </div>
      </section>
      <section className="text-sm">
        <p className="mb-2 font-medium">최종 판정</p>
        <div className="flex gap-4">
          {(["무상", "유상"] as const).map((item) => (
            <label key={item} className="flex items-center gap-2">
              <input type="radio" name="judgment" checked={judgment === item} onChange={() => setJudgment(item)} />
              {item}
            </label>
          ))}
        </div>
        <TextArea className="mt-3" label="판정 사유" value={reason} onChange={setReason} />
      </section>
      <section className="grid gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_2fr_auto]">
        <select value={rejectCategory} onChange={(event) => setRejectCategory(event.target.value)} className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm">
          <option value="">--카테고리 선택--</option>
          <option value="repair-impossible">수리 불가</option>
          <option value="customer-cancel">고객 취소</option>
        </select>
        <input value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} placeholder="사유 입력" className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" />
        <Button
          onClick={() => {
            if (rejectCategory === "" || rejectReason.trim() === "") {
              setNotice("A/S 거부 사유를 입력해 주세요.");
              return;
            }
            setNotice("거부 사유를 화면에 입력했습니다.");
          }}
        >
          제출
        </Button>
      </section>
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
        <div className="flex justify-between"><span>항목 합계</span><span>{won(laborTotal)}</span></div>
        <div className="flex justify-between text-blue-700"><span>보증 무상</span><span>-{won(warranty)}</span></div>
        <div className="mt-2 flex justify-between border-t border-blue-200 pt-2 font-semibold"><span>청구 금액</span><span>{judgment === null ? "미판정" : won(charge)}</span></div>
      </div>
      {diagnosing && (
        <div className="flex justify-end">
          <Button disabled={submitting} onClick={() => void complete()}>
            {submitting ? "점검 완료 처리 중…" : "점검 완료"}
          </Button>
        </div>
      )}
      {presetOpen && (
  <PresetPickerModal
    onClose={() => setPresetOpen(false)}
    onApply={async (preset, workName) => {
      const newLine: RepairLine = {
        id: `preset-${preset.id}-${Date.now()}`,
        kind: "작업",
        name: workName,
        quantityLabel: "1회",
        unitPriceLabel: won(preset.basePrice),
        amount: preset.basePrice,
        presetId: preset.id,
      };

      setLines((current) => [...current, newLine]);

      setNotice("수리 프리셋을 점검 항목에 반영했습니다.");
    }}
  />
)}
    </div>
  );
}

function inspectionResultMessage(status: ReceptionRepair["status"]): string {
  if (status === "REQUESTED") {
    return "견적 승인 대기입니다. 고객이 승인하면 수리 페이지에서 수리를 시작할 수 있습니다.";
  }
  if (status === "APPROVED" || status === "REPAIRING" || status === "COMPLETED") {
    return "고객이 견적을 승인했습니다. 수리 페이지에서 진행합니다.";
  }
  if (status === "REJECTED") {
    return "고객이 견적을 거부했습니다.";
  }
  return "점검이 완료된 건입니다.";
}

function LineTable({ lines, onRemove }: { lines: RepairLine[]; onRemove: (id: string) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
          <tr>
            {["구분", "항목", "시간/수량", "단가", "금액", ""].map((header) => (
              <th key={header} className="px-3 py-2 font-medium">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line) => (
            <tr key={line.id} className="border-t border-neutral-200">
              <td className="px-3 py-2">{line.kind}</td>
              <td className="px-3 py-2">{line.indent === true ? `└ ${line.name}` : line.name}</td>
              <td className="px-3 py-2">{line.quantityLabel}</td>
              <td className="px-3 py-2">{line.unitPriceLabel}</td>
              <td className="px-3 py-2">{line.amount === 0 ? "-" : line.amount.toLocaleString("ko-KR")}</td>
              <td className="px-3 py-2 text-right">
                {line.kind !== "증상" && (
                  <button type="button" className="text-neutral-500" onClick={() => onRemove(line.id)}>X</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}