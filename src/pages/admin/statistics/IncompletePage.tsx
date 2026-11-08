import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import { isReceptionStatus, receptionStatusLabel } from "@/lib/asReceptionApi";
import { formatDate } from "@/lib/format";
import { fetchLongPendingReceptions } from "@/lib/longPendingApi";
import { AS_RECEPTION_STATUSES, type AsReceptionStatus } from "@/types/asReception";
import type { LongPendingReception } from "@/types/longPending";

type ElapsedFilter = "ALL" | "14" | "21";
type StatusFilter = "ALL" | AsReceptionStatus;

const pendingStatuses = AS_RECEPTION_STATUSES.filter((status) => status !== "COMPLETED");

export function IncompletePage() {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState<ElapsedFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [receptions, setReceptions] = useState<LongPendingReception[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchLongPendingReceptions(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setReceptions(items);
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) {
          return;
        }
        setReceptions([]);
        setError(cause instanceof Error ? cause.message : "장기 미처리 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  const rows = useMemo(
    () =>
      receptions.filter((row) => {
        const matchedElapsed = elapsed === "ALL" || (elapsed === "14" ? row.elapsedDays >= 14 : row.elapsedDays >= 21);
        return matchedElapsed && (status === "ALL" || row.status === status);
      }),
    [elapsed, receptions, status],
  );
  const columns: Column<LongPendingReception>[] = [
    { key: "as", header: "접수번호", render: (row) => row.receptionNumber },
    { key: "customer", header: "고객명", render: (row) => row.customerName },
    { key: "model", header: "모델", render: (row) => row.modelName },
    { key: "status", header: "현재 상태", render: (row) => receptionStatusLabel(row.status) },
    { key: "tech", header: "담당 기사", render: (row) => row.technicianName ?? "-" },
    { key: "elapsed", header: "경과일", render: (row) => `${row.elapsedDays}일` },
    { key: "last", header: "최근 활동일", render: (row) => formatDate(row.lastActivityAt) },
  ];
  return (
    <div>
      <p className="mb-4">
        <Link to="/admin/statistics" className="text-sm text-blue-600">통계/리포트로 돌아가기</Link>
      </p>
      <div className="mb-4 flex gap-2">
        <SelectBox
          value={elapsed}
          onChange={(value) => {
            if (value === "ALL" || value === "14" || value === "21") {
              setElapsed(value);
            }
          }}
          options={[{ value: "ALL", label: "경과일 전체" }, { value: "14", label: "14일 이상" }, { value: "21", label: "21일 이상" }]}
        />
        <SelectBox
          value={status}
          onChange={(value) => {
            if (value === "ALL" || (isReceptionStatus(value) && value !== "COMPLETED")) {
              setStatus(value);
            }
          }}
          options={[
            { value: "ALL", label: "상태 전체" },
            ...pendingStatuses.map((item) => ({ value: item, label: receptionStatusLabel(item) })),
          ]}
        />
      </div>
      {error !== "" && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.receptionId)}
        emptyText={loading ? "장기 미처리 목록을 불러오는 중입니다." : "장기 미처리 접수가 없습니다."}
        onRowClick={(row) => navigate(`/as/details/${row.receptionId}`)}
      />
    </div>
  );
}
