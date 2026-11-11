import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { SortMenu } from "@/components/ui/SortMenu";
import { isAbortError } from "@/lib/apiClient";
import { isReceptionStatus, receptionStatusLabel } from "@/lib/asReceptionApi";
import { formatDate, includesText } from "@/lib/format";
import { compareText } from "@/lib/guards";
import { fetchLongPendingReceptions } from "@/lib/longPendingApi";
import { useStatisticsPage } from "@/pages/admin/statistics/useStatisticsPage";
import { AS_RECEPTION_STATUSES, type AsReceptionStatus } from "@/types/asReception";
import type { LongPendingReception } from "@/types/longPending";

type ElapsedFilter = "ALL" | "14" | "21";
type StatusFilter = "ALL" | AsReceptionStatus;
type PendingSortKey = "number" | "elapsed" | "changedAt";

const pendingStatuses = AS_RECEPTION_STATUSES.filter((status) => status !== "COMPLETED");

export function IncompletePage() {
  const navigate = useNavigate();
  const [elapsed, setElapsed] = useState<ElapsedFilter>("ALL");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [receptions, setReceptions] = useState<LongPendingReception[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortKey, setSortKey] = useState<PendingSortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

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

  const rows = useMemo(() => {
    const filtered = receptions.filter((row) => {
      const matchedElapsed = elapsed === "ALL" || (elapsed === "14" ? row.elapsedDays >= 14 : row.elapsedDays >= 21);
      const matchedStatus = status === "ALL" || row.status === status;
      const matchedKeyword = includesText(
        `${row.receptionNumber} ${row.customerName} ${row.modelName} ${row.technicianName ?? ""}`,
        appliedKeyword,
      );
      return matchedElapsed && matchedStatus && matchedKeyword;
    });
    return sortPending(filtered, sortKey, sortDir);
  }, [appliedKeyword, elapsed, receptions, sortDir, sortKey, status]);
  const list = useStatisticsPage(rows, `${appliedKeyword}|${elapsed}|${status}|${sortKey ?? ""}|${sortDir}`);

  function toggleSort(key: PendingSortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const columns: Column<LongPendingReception>[] = [
    {
      key: "as",
      header: <SortMenu label="접수번호" active={sortKey === "number"} direction={sortDir} onToggle={() => toggleSort("number")} />,
      render: (row) => row.receptionNumber,
    },
    { key: "customer", header: "고객명", render: (row) => row.customerName },
    { key: "model", header: "모델", render: (row) => row.modelName },
    { key: "status", header: "현재 상태", render: (row) => receptionStatusLabel(row.status) },
    { key: "tech", header: "담당 기사", render: (row) => row.technicianName ?? "-" },
    {
      key: "elapsed",
      header: <SortMenu label="경과일" active={sortKey === "elapsed"} direction={sortDir} onToggle={() => toggleSort("elapsed")} />,
      render: (row) => `${row.elapsedDays}일`,
    },
    {
      key: "last",
      header: (
        <SortMenu
          label="마지막 상태 변경일"
          active={sortKey === "changedAt"}
          direction={sortDir}
          onToggle={() => toggleSort("changedAt")}
        />
      ),
      render: (row) => formatDate(row.lastActivityAt),
    },
  ];
  return (
    <div>
      <p className="mb-4">
        <Link to="/admin/statistics" className="text-sm text-blue-600">통계/리포트로 돌아가기</Link>
      </p>
      <form
        className="mb-4 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedKeyword(keyword);
        }}
      >
        <TextField value={keyword} onChange={setKeyword} placeholder="접수번호, 고객명" className="w-48" />
        <Button type="submit">검색</Button>
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
      </form>
      {error !== "" && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
      <DataTable
        columns={columns}
        rows={list.visible}
        rowKey={(row) => String(row.receptionId)}
        emptyText={loading ? "장기 미처리 목록을 불러오는 중입니다." : "장기 미처리 접수가 없습니다."}
        onRowClick={(row) => navigate(`/as/details/${row.receptionId}`)}
      />
      <Pagination page={list.page} pageCount={list.pageCount} onPageChange={list.setPage} />
    </div>
  );
}

function sortPending(
  rows: LongPendingReception[],
  sortKey: PendingSortKey | null,
  sortDir: "asc" | "desc",
): LongPendingReception[] {
  if (sortKey === null) {
    return rows;
  }
  const direction = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => comparePending(left, right, sortKey) * direction);
}

function comparePending(left: LongPendingReception, right: LongPendingReception, sortKey: PendingSortKey): number {
  if (sortKey === "number") {
    return compareText(left.receptionNumber, right.receptionNumber);
  }
  if (sortKey === "elapsed") {
    return left.elapsedDays - right.elapsedDays;
  }
  return compareText(left.lastActivityAt, right.lastActivityAt);
}
