import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import { categoryLabel, fetchProduct, startMyInspection } from "@/lib/asReceptionApi";
import {
  calculateRepairCost,
  confirmRepairCost,
  createRepairPartUsage,
  createRepairWork,
  fetchRepairPresetParts,
  fetchRepairPresets,
  fetchRepairPresetsBySymptom,
  fetchRepairWorks,
  fetchSymptomPresets,
  updateRepair,
  type RepairPreset,
  type RepairPresetPart,
  type RepairWork,
} from "@/lib/repair";
import { formatYearMonthDay, won } from "@/lib/format";
import { assessWarranty, type WarrantyCoverage } from "@/lib/warranty";
import { ReceptionProgress } from "@/pages/as/ReceptionProgress";
import type { AsReceptionDetail, ReceptionRepair } from "@/types/asReception";
import { AsSummary } from "@/pages/as/AsSummary";
import { PresetPickerModal, type InspectionPresetSelection } from "@/pages/as/PresetPickerModal";
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

// 점검 항목은 고장 증상, 수리 프리셋, 소모 부품 순서로 쌓인다.
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
  const [savedLoading, setSavedLoading] = useState(true);
  const [note, setNote] = useState(repair.diagnosis ?? "");
  const [coverageLoad, setCoverageLoad] = useState<CoverageLoad>({ status: "loading" });
  const [customerFault, setCustomerFault] = useState(false);
  const [reason, setReason] = useState(repair.reason ?? "");
  const [rejectCategory, setRejectCategory] = useState("");
  const [rejectReason, setRejectReason] = useState(repair.reasonForRejection ?? "");
  const [presetOpen, setPresetOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const diagnosing = repair.status === "DIAGNOSING";

  // 1차 보증 판정은 구매일과 모델 보증기간으로 계산한다.
  useEffect(() => {
    const controller = new AbortController();

    fetchProduct(record.product.id, controller.signal)
      .then((product) => {
        if (controller.signal.aborted) {
          return;
        }
        const coverage = assessWarranty(product.purchasedAt, product.warrantyMonths);
        setCoverageLoad({ status: "ready", coverage });
        setCustomerFault(coverage?.covered === true && repair.warrantyResult === "PAID");
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) {
          return;
        }
        setCoverageLoad({ status: "error" });
      });

    return () => controller.abort();
  }, [record.product.id, repair.warrantyResult]);

  // 완료 후 새로고침해도 서버에 남은 작업과 부품을 다시 표에 그린다.
  useEffect(() => {
    const controller = new AbortController();

    async function loadSavedLines() {
      try {
        const works = await fetchRepairWorks(repair.id, controller.signal);
        if (works.length === 0) {
          if (!controller.signal.aborted) setLines([]);
          return;
        }

        const [presets, product, symptoms] = await Promise.all([
          fetchRepairPresets(controller.signal),
          fetchProduct(record.product.id, controller.signal),
          fetchSymptomPresets(controller.signal),
        ]);
        const category = categoryLabel(product.category);
        const relations = await Promise.all(
          symptoms
            .filter((symptom) => symptom.productCategory === category)
            .map(async (symptom) => ({
              id: symptom.id,
              name: symptom.name,
              presets: await fetchRepairPresetsBySymptom(symptom.id, controller.signal),
            })),
        );
        const presetByName = new Map(presets.map((preset) => [preset.name, preset]));
        const symptomsByPresetId = new Map<number, SavedSymptom[]>();
        for (const relation of relations) {
          for (const preset of relation.presets) {
            const linked = symptomsByPresetId.get(preset.id) ?? [];
            linked.push({ id: relation.id, name: relation.name });
            symptomsByPresetId.set(preset.id, linked);
          }
        }

        const partsByPresetId = new Map<number, RepairPresetPart[]>();
        await Promise.all(works.map(async (work) => {
          const presetName = work.repairPresetName?.trim() ?? "";
          const preset = presetByName.get(presetName);
          if (preset === undefined || partsByPresetId.has(preset.id)) return;
          const parts = await fetchRepairPresetParts(preset.id, controller.signal);
          partsByPresetId.set(preset.id, parts);
        }));

        if (controller.signal.aborted) return;
        setLines(linesFromSavedWorks(works, presetByName, symptomsByPresetId, partsByPresetId));
      } catch (cause: unknown) {
        if (controller.signal.aborted || isAbortError(cause)) return;
        setNotice(cause instanceof Error ? cause.message : "저장된 점검 항목을 불러오지 못했습니다.");
      } finally {
        if (!controller.signal.aborted) setSavedLoading(false);
      }
    }

    void loadSavedLines();
    return () => controller.abort();
  }, [record.id, repair.id]);

  const laborTotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.amount, 0),
    [lines],
  );
  
  const coverage = coverageLoad.status === "ready" ? coverageLoad.coverage : null;
  const autoJudgment: "무상" | "유상" | null = coverage === null ? null : coverage.covered ? "무상" : "유상";
  const savedJudgment = repair.warrantyResult === "FREE" ? "무상" : repair.warrantyResult === "PAID" ? "유상" : null;
  const judgment = diagnosing
    ? (autoJudgment === "무상" && customerFault ? "유상" : autoJudgment)
    : savedJudgment;
  const charge = judgment === "무상" ? 0 : laborTotal;
  const warranty = judgment === "무상" ? laborTotal : 0;

  async function complete() {
    if (note.trim() === "") {
      setNotice("점검 내용을 입력해 주세요.");
      return;
    }
  
    if (judgment === null) {
      setNotice("구매일 또는 보증기간을 확인할 수 없어 판정할 수 없습니다.");
      return;
    }

    if (customerFault && reason.trim() === "") {
      setNotice("고객 과실로 유상 처리할 사유를 입력해 주세요.");
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
  
      // 2. 증상별로 고른 수리 프리셋을 작업으로 등록하고, 그 프리셋의 부품 사용도 함께 남긴다.
      for (const line of lines) {
        if (line.kind !== "작업" || line.presetId === undefined) {
          continue;
        }

        const symptom = lines.find((item) => item.kind === "증상" && item.symptomId === line.symptomId);
        const work = await createRepairWork({
          repairId: repair.id,
          presetId: line.presetId,
          workName: symptom?.name ?? line.name,
        });

        const parts = lines
          .filter(isConsumedPart)
          .filter((item) => item.groupId === line.groupId);
        for (const part of parts) {
          await createRepairPartUsage({
            repairWorkId: work.id,
            partId: part.partId,
            quantity: part.quantity ?? 1,
          });
        }
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
        <Notice>유상으로 저장하면 견적 승인 대기가 됩니다. 무상은 0원으로 확정되고 고객 승인 없이 수리 대기로 넘어갑니다.</Notice>
      ) : (
        <Notice>{inspectionResultMessage(repair)}</Notice>
      )}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">점검 항목</p>
          {diagnosing && (
            <Button variant="outline" onClick={() => setPresetOpen(true)}>수리 프리셋</Button>
          )}
        </div>
        <LineTable
          lines={lines}
          loading={savedLoading}
          editable={diagnosing}
          onRemoveGroup={(groupId) => setLines((current) => withoutPresetGroup(current, groupId))}
        />
        <p className="mt-2 text-right text-sm">견적 합계 <span className="ml-6 font-semibold text-blue-700">{won(laborTotal)}</span></p>
      </section>
      <TextArea label="점검 내용" value={note} onChange={setNote} readOnly={!diagnosing} />
      <WarrantySection
        load={coverageLoad}
        autoJudgment={autoJudgment}
        judgment={judgment}
        customerFault={customerFault}
        diagnosing={diagnosing}
        onCustomerFault={setCustomerFault}
      />
      <TextArea className="text-sm" label="판정 사유" value={reason} onChange={setReason} readOnly={!diagnosing} />
      {diagnosing && (
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
      )}
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
        <div className="flex justify-between"><span>항목 합계</span><span>{won(laborTotal)}</span></div>
        <div className="flex justify-between text-blue-700"><span>보증 무상</span><span>-{won(warranty)}</span></div>
        <div className="mt-2 flex justify-between border-t border-blue-200 pt-2 font-semibold"><span>청구 금액</span><span>{judgment === null ? "미판정" : won(charge)}</span></div>
      </div>
      {diagnosing && (
        <div className="flex justify-end">
          <Button disabled={submitting || judgment === null} onClick={() => void complete()}>
            {submitting ? "점검 완료 처리 중…" : "점검 완료"}
          </Button>
        </div>
      )}
      {presetOpen && (
        <PresetPickerModal
          productId={record.product.id}
          onClose={() => setPresetOpen(false)}
          onApply={async (selection) => {
            setLines((current) => appendSymptomPresets(current, selection));
            setNotice("같은 고장 증상에 수리 프리셋을 추가했습니다.");
          }}
        />
      )}
    </div>
  );
}

type CoverageLoad =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; coverage: WarrantyCoverage | null };

function WarrantySection({
  load,
  autoJudgment,
  judgment,
  customerFault,
  diagnosing,
  onCustomerFault,
}: {
  load: CoverageLoad;
  autoJudgment: "무상" | "유상" | null;
  judgment: "무상" | "유상" | null;
  customerFault: boolean;
  diagnosing: boolean;
  onCustomerFault: (checked: boolean) => void;
}) {
  const coverage = load.status === "ready" ? load.coverage : null;

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 text-sm shadow-sm">
      <p className="mb-3 font-medium">보증 판정</p>
      {load.status === "loading" && <p>보증 기간을 확인하는 중입니다.</p>}
      {load.status === "error" && <p>보증 기간을 확인하지 못했습니다.</p>}
      {load.status === "ready" && coverage === null && (
        <p>구매일 또는 모델의 보증기간이 없어 자동으로 판정할 수 없습니다.</p>
      )}
      {coverage !== null && (
        <div className="grid gap-3 sm:grid-cols-2">
          <p>구매일 {formatYearMonthDay(coverage.purchasedAt)}</p>
          <p>보증기간 {coverage.warrantyMonths}개월</p>
          <p>만료일 {formatYearMonthDay(coverage.expiresOn)}</p>
          <p>1차 판정 {autoJudgment === "무상" ? "보증 기간 안, 무상" : "보증 기간 만료, 유상"}</p>
        </div>
      )}
      <div className="mt-4 border-t border-neutral-200 pt-4">
        <p className="font-medium">최종 판정 {judgment ?? "확인 중"}</p>
        {autoJudgment === "무상" && (
          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={customerFault}
              disabled={!diagnosing}
              onChange={(event) => onCustomerFault(event.target.checked)}
            />
            고객 과실로 유상 변경
          </label>
        )}
        {autoJudgment === "유상" && (
          <p className="mt-2 text-neutral-500">보증 기간이 지나 유상입니다.</p>
        )}
      </div>
    </section>
  );
}

function inspectionResultMessage(repair: ReceptionRepair): string {
  if (repair.status === "REQUESTED") {
    return "견적 승인 대기입니다. 고객이 승인하면 수리 페이지에서 수리를 시작할 수 있습니다.";
  }
  if (repair.status === "APPROVED" && repair.warrantyResult === "FREE") {
    return "무상 수리로 확정되었습니다. 수리 페이지에서 수리를 시작합니다.";
  }
  if (repair.status === "APPROVED" || repair.status === "REPAIRING" || repair.status === "COMPLETED") {
    return "고객이 견적을 승인했습니다. 수리 페이지에서 진행합니다.";
  }
  if (repair.status === "REJECTED") {
    return "고객이 견적을 거부했습니다. 점검비 결제 후 배송 또는 수령으로 넘어갑니다.";
  }
  return "점검이 완료된 건입니다.";
}

function isConsumedPart(line: RepairLine): line is RepairLine & { partId: number } {
  return line.kind === "부품" && typeof line.partId === "number";
}

function presetLines(symptomId: number, choice: InspectionPresetSelection["presets"][number]): RepairLine[] {
  const groupId = `group-${symptomId}-${choice.preset.id}-${Date.now()}`;
  const presetLine: RepairLine = {
    id: `${groupId}-preset`,
    groupId,
    symptomId,
    kind: "작업",
    name: choice.preset.name,
    quantityLabel: `${choice.preset.estimatedMinutes}분`,
    unitPriceLabel: "-",
    amount: 0,
    presetId: choice.preset.id,
  };
  const partLines: RepairLine[] = choice.parts.map((part) => ({
    id: `${groupId}-part-${part.partId}`,
    groupId,
    symptomId,
    kind: "부품" as const,
    name: part.partName,
    quantityLabel: `${part.quantity}개`,
    unitPriceLabel: won(part.unitPrice),
    amount: part.unitPrice * part.quantity,
    indent: true,
    partId: part.partId,
    quantity: part.quantity,
  }));

  return [presetLine, ...partLines];
}

function appendSymptomPresets(current: RepairLine[], selection: InspectionPresetSelection): RepairLine[] {
  const takenPresetIds = new Set(
    current
      .filter((line) => line.kind === "작업" && line.symptomId === selection.symptom.id && line.presetId !== undefined)
      .map((line) => line.presetId),
  );
  const fresh = selection.presets.filter((choice) => !takenPresetIds.has(choice.preset.id));
  if (fresh.length === 0) return current;

  const presetRows = fresh.flatMap((choice) => presetLines(selection.symptom.id, choice));
  const symptomIndex = current.findIndex(
    (line) => line.kind === "증상" && line.symptomId === selection.symptom.id,
  );
  if (symptomIndex === -1) {
    const symptomLine: RepairLine = {
      id: `symptom-${selection.symptom.id}`,
      symptomId: selection.symptom.id,
      kind: "증상",
      name: selection.symptom.name,
      quantityLabel: "-",
      unitPriceLabel: "-",
      amount: 0,
    };
    return [...current, symptomLine, ...presetRows];
  }

  let end = symptomIndex + 1;
  while (end < current.length && current[end]?.kind !== "증상") end += 1;
  return [...current.slice(0, end), ...presetRows, ...current.slice(end)];
}

function withoutPresetGroup(lines: RepairLine[], groupId: string): RepairLine[] {
  const next = lines.filter((line) => line.groupId !== groupId);
  return next.filter((line, index) => {
    if (line.kind !== "증상") return true;
    const following = next.slice(index + 1);
    const nextSymptom = following.findIndex((item) => item.kind === "증상");
    const block = nextSymptom === -1 ? following : following.slice(0, nextSymptom);
    return block.some((item) => item.kind === "작업");
  });
}

interface SavedSymptom {
  id: number;
  name: string;
}

function linesFromSavedWorks(
  works: RepairWork[],
  presetByName: Map<string, RepairPreset>,
  symptomsByPresetId: Map<number, SavedSymptom[]>,
  partsByPresetId: Map<number, RepairPresetPart[]>,
): RepairLine[] {
  const rows: RepairLine[] = [];

  for (const work of works) {
    const groupId = `saved-${work.id}`;
    const presetName = work.repairPresetName?.trim() || work.workName;
    const preset = presetByName.get(presetName);
    const storedSymptom = work.workName.trim();
    const linkedSymptoms = preset === undefined ? [] : symptomsByPresetId.get(preset.id) ?? [];
    const symptom = storedSymptom !== "" && storedSymptom !== presetName
      ? linkedSymptoms.find((item) => item.name === storedSymptom) ?? { id: 0, name: storedSymptom }
      : linkedSymptoms.length === 1 ? linkedSymptoms[0] : undefined;
    const parts = preset === undefined ? [] : partsByPresetId.get(preset.id) ?? [];
    const block: RepairLine[] = [{
      id: `${groupId}-preset`,
      groupId,
      symptomId: symptom !== undefined && symptom.id !== 0 ? symptom.id : undefined,
      kind: "작업",
      name: presetName,
      quantityLabel: preset === undefined ? "-" : `${preset.estimatedMinutes}분`,
      unitPriceLabel: "-",
      amount: 0,
      presetId: preset?.id,
    }];

    for (const part of parts) {
      block.push({
        id: `${groupId}-part-${part.partId}`,
        groupId,
        symptomId: symptom !== undefined && symptom.id !== 0 ? symptom.id : undefined,
        kind: "부품",
        name: part.partName,
        quantityLabel: `${part.quantity}개`,
        unitPriceLabel: won(part.unitPrice),
        amount: part.unitPrice * part.quantity,
        indent: true,
      });
    }

    if (symptom === undefined) {
      rows.push(...block);
      continue;
    }

    const symptomIndex = rows.findIndex((line) => line.kind === "증상" && line.name === symptom.name);
    if (symptomIndex === -1) {
      rows.push({
        id: symptom.id === 0 ? `${groupId}-symptom` : `symptom-${symptom.id}`,
        symptomId: symptom.id === 0 ? undefined : symptom.id,
        kind: "증상",
        name: symptom.name,
        quantityLabel: "-",
        unitPriceLabel: "-",
        amount: 0,
      }, ...block);
      continue;
    }

    let end = symptomIndex + 1;
    while (end < rows.length && rows[end]?.kind !== "증상") end += 1;
    rows.splice(end, 0, ...block);
  }

  return rows;
}

function inspectionBoundaryClass(kind: RepairLine["kind"], previous: RepairLine | undefined): string {
  if (kind === "증상") {
    return previous === undefined
      ? "bg-neutral-100"
      : "border-t-4 border-neutral-500 bg-neutral-100";
  }
  if (kind === "부품") {
    return "border-t border-neutral-100";
  }
  return "border-t border-neutral-200";
}

function LineTable({
  lines,
  loading,
  editable,
  onRemoveGroup,
}: {
  lines: RepairLine[];
  loading: boolean;
  editable: boolean;
  onRemoveGroup: (groupId: string) => void;
}) {
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
          {loading ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-neutral-500">
                저장된 점검 항목을 불러오는 중입니다.
              </td>
            </tr>
          ) : lines.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-8 text-center text-neutral-500">
                {editable
                  ? "고장 증상, 수리 프리셋, 소모 부품 순서로 점검 항목을 추가해 주세요."
                  : "저장된 점검 항목이 없습니다."}
              </td>
            </tr>
          ) : lines.map((line, index) => {
            const groupId = line.groupId;
            const boundary = inspectionBoundaryClass(line.kind, lines[index - 1]);
            const leadClass = line.kind === "부품" ? `py-2 pr-3 pl-8 ${boundary}` : `px-3 py-2 ${boundary}`;
            const cellClass = `px-3 py-2 ${boundary}`;
            return (
              <tr key={line.id}>
                <td className={leadClass}>{line.kind === "작업" ? "프리셋" : line.kind}</td>
                <td className={leadClass}>{line.name}</td>
                <td className={cellClass}>{line.quantityLabel}</td>
                <td className={cellClass}>{line.unitPriceLabel}</td>
                <td className={cellClass}>{line.amount === 0 ? "-" : line.amount.toLocaleString("ko-KR")}</td>
                <td className={`${cellClass} text-right`}>
                  {editable && line.kind === "작업" && groupId !== undefined && (
                    <button type="button" className="text-neutral-500" onClick={() => onRemoveGroup(groupId)}>X</button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}