import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { startMyInspection } from "@/lib/asReceptionApi";
import { formatDate, won } from "@/lib/format";
import { ReceptionProgress } from "@/pages/as/ReceptionProgress";
import type { AsReceptionDetail, ReceptionRepair } from "@/types/asReception";
import { AsSummary } from "@/pages/as/AsSummary";
import { PresetPickerModal } from "@/pages/as/PresetPickerModal";
import { ProgressTabs } from "@/pages/as/ProgressTabs";
import type { RepairLine } from "@/types/screen";

export function InspectionPage() {
  return (
    <ReceptionProgress render={({ reception, repair }, reload) => (
      repair === null
        ? <InspectionStart record={reception} onStarted={reload} />
        : <InspectionForm key={repair.id} record={reception} repair={repair} />
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

function InspectionForm({ record, repair }: { record: AsReceptionDetail; repair: ReceptionRepair }) {
  const [lines, setLines] = useState<RepairLine[]>([]);
  const [note, setNote] = useState(repair.diagnosis ?? "");
  const [photos, setPhotos] = useState<string[]>([]);
  const [judgment, setJudgment] = useState<"무상" | "유상" | null>(
    repair.warrantyResult === "FREE" ? "무상" : repair.warrantyResult === "PAID" ? "유상" : null,
  );
  const [reason, setReason] = useState(repair.reason ?? "");
  const [rejectCategory, setRejectCategory] = useState("");
  const [rejectReason, setRejectReason] = useState(repair.reasonForRejection ?? "");
  const [presetOpen, setPresetOpen] = useState(false);
  const [notice, setNotice] = useState("");

  const laborTotal = useMemo(() => lines.reduce((sum, line) => sum + line.amount, 0), [lines]);
  const warranty = judgment === "무상" ? laborTotal : 0;
  const charge = judgment === "무상" ? 0 : laborTotal;

  return (
    <div className="space-y-4">
      {notice !== "" && <Notice>{notice}</Notice>}
      <AsSummary record={record} />
      <ProgressTabs receptionId={record.id} current="inspection" />
      <Notice>점검 입력은 화면에서 미리 확인할 수 있습니다.</Notice>
      <section>
        <p className="mb-2 text-sm font-medium">점검 사진</p>
        <label className="grid h-28 w-full max-w-sm cursor-pointer place-items-center rounded-xl border border-dashed border-neutral-300 bg-white text-sm text-neutral-500">
          사진 추가
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file === undefined) return;
              setPhotos((current) => [...current, URL.createObjectURL(file)]);
            }}
          />
        </label>
        {photos.length > 0 && (
          <div className="mt-2 flex gap-2">
            {photos.map((src) => (
              <img key={src} src={src} alt="점검 사진" className="size-20 rounded-lg border border-neutral-200 object-cover" />
            ))}
          </div>
        )}
      </section>
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
          <p>구매일 {formatDate(record.product.purchasedAt)}</p>
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
      <div className="flex justify-end">
        <Button
          onClick={() => {
            if (note.trim() === "") {
              setNotice("점검 내용을 입력해 주세요.");
              return;
            }
            setNotice("점검 입력 내용을 확인했습니다.");
          }}
        >
          점검 완료
        </Button>
      </div>
      {presetOpen && (
        <PresetPickerModal
          onClose={() => setPresetOpen(false)}
          onApply={(next) => {
            setLines((current) => [...current, ...next]);
            setNotice("수리 프리셋을 점검 항목에 반영했습니다.");
          }}
        />
      )}
    </div>
  );
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
