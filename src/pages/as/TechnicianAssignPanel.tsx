import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice, Panel } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import { fetchAssignableTechnicians, fetchTechnicianHistory, reassignTechnician } from "@/lib/asReceptionApi";
import { formatDateTime, formatDurationMinutes } from "@/lib/format";
import { useSessionStore } from "@/stores/useSessionStore";
import type { AsReceptionDetail, AsReceptionStatus, AssignableTechnician, TechnicianAssignmentHistory } from "@/types/asReception";

const closedStatuses: readonly AsReceptionStatus[] = [
  "AWAITING_PAYMENT",
  "AWAITING_SHIPMENT",
  "AWAITING_PICKUP",
  "COMPLETED",
];

interface TechnicianAssignPanelProps {
  detail: AsReceptionDetail;
  refreshKey: number;
  onReassigned: (message: string) => void;
}

export function TechnicianAssignPanel({ detail, refreshKey, onReassigned }: TechnicianAssignPanelProps) {
  const role = useSessionStore((state) => state.user?.role);
  const canAssign = role === "ADMIN" || role === "RECEPTIONIST";
  const locked = closedStatuses.includes(detail.status);
  const [technicians, setTechnicians] = useState<AssignableTechnician[]>([]);
  const [history, setHistory] = useState<TechnicianAssignmentHistory[]>([]);
  const [technicianId, setTechnicianId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!canAssign) {
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");

    // 재배정 가능 여부와 관계없이 이력은 항상 보여 준다.
    Promise.all([
      fetchAssignableTechnicians("", "INSPECTION_WAITING_COUNT", "ASC", controller.signal),
      fetchTechnicianHistory(detail.id, controller.signal),
    ])
      .then(([nextTechnicians, nextHistory]) => {
        if (controller.signal.aborted) {
          return;
        }
        setTechnicians(nextTechnicians);
        setHistory(nextHistory);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) {
          return;
        }
        setTechnicians([]);
        setHistory([]);
        setError(cause instanceof Error ? cause.message : "기사 배정 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [canAssign, detail.id, refreshKey]);

  if (!canAssign) {
    return null;
  }

  async function save() {
    const nextId = Number(technicianId);
    if (!Number.isInteger(nextId) || nextId <= 0) {
      setError("새로 배정할 기사를 선택해 주세요.");
      return;
    }
    if (detail.technician?.id === nextId) {
      setError("현재 담당 기사와 다른 기사를 선택해 주세요.");
      return;
    }
    if (reason.trim() === "") {
      setError("재배정 사유를 입력해 주세요.");
      return;
    }
    setPending(true);
    setError("");
    try {
      await reassignTechnician(detail.id, nextId, reason);
      const selected = technicians.find((item) => item.id === nextId);
      setTechnicianId("");
      setReason("");
      onReassigned(`${selected?.name ?? "기사"} 님으로 다시 배정했습니다.`);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "기사를 다시 배정하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title="담당 기사 재배정">
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <p className="mb-3 text-sm">현재 담당 기사: {detail.technician?.name ?? "-"}</p>
      {locked ? (
        <p className="mb-4 text-sm text-neutral-500">결제 대기 이후에는 기사를 다시 배정할 수 없습니다.</p>
      ) : (
        <div className="mb-4 flex flex-wrap items-end gap-2">
          <SelectBox
            value={technicianId}
            onChange={setTechnicianId}
            options={[
              { value: "", label: "기사 선택" },
              ...technicians.map((item) => ({
                value: String(item.id),
                label: `${item.name} · 점검 ${item.inspectionWaitingCount} · 수리 ${item.repairInProgressCount} · ${formatDurationMinutes(item.estimatedDurationMinutes)}`,
              })),
            ]}
          />
          <TextField className="w-72" value={reason} onChange={setReason} placeholder="재배정 사유" />
          <Button onClick={() => void save()} disabled={pending || loading}>재배정</Button>
        </div>
      )}
      <h3 className="mb-2 text-sm font-semibold text-neutral-900">배정 이력</h3>
      {loading ? (
        <p className="text-sm text-neutral-500">배정 이력을 불러오는 중입니다.</p>
      ) : history.length === 0 ? (
        <p className="text-sm text-neutral-500">배정 이력이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {history.map((item, index) => (
            <li key={`${item.createdAt}:${item.newTechnician?.id ?? 0}:${index}`} className="text-sm">
              <p className="font-medium">
                {item.previousTechnician?.name ?? "-"} → {item.newTechnician?.name ?? "-"}
              </p>
              <p className="mt-1 text-neutral-500">
                {formatDateTime(item.createdAt)} · {item.changedBy?.name ?? "-"} · {item.reason ?? "-"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
