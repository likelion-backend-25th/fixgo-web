import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { readNotice } from "@/lib/guards";
import { formatDateTime } from "@/lib/format";
import { isAbortError } from "@/lib/apiClient";
import {
  fetchReceptions,
  isReceptionStatus,
  receptionStatusLabel,
  searchTechnicians,
} from "@/lib/asReceptionApi";
import { useSessionStore } from "@/stores/useSessionStore";
import { AS_RECEPTION_STATUSES, type AsReceptionListItem, type AsReceptionStatus, type TechnicianSummary } from "@/types/asReception";

const PAGE_SIZE = 20;

type StatusFilter = "ALL" | AsReceptionStatus;
type SortKey = "receptionNumber" | "createdAt" | "status" | "customerName";

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "상태 전체" },
  ...AS_RECEPTION_STATUSES.map((status) => ({ value: status, label: receptionStatusLabel(status) })),
];

export function AsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const memberId = useSessionStore((state) => state.memberId);
  const isTechnician = user?.role === "TECHNICIAN";
  const canCreate = user?.role === "ADMIN" || user?.role === "RECEPTIONIST" || user?.role === "MANAGER";
  const notice = readNotice(location.state);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [assignee, setAssignee] = useState("ALL");
  const [technicians, setTechnicians] = useState<TechnicianSummary[]>([]);
  const [mineOnly, setMineOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState({ keyword: "", status: "ALL" as StatusFilter });
  const technicianId = mineOnly ? memberId : assignee === "ALL" ? null : Number(assignee);
  const filterKey = `${applied.keyword}:${applied.status}:${technicianId ?? ""}:${sortKey}:${sortDir}`;
  const [seenFilter, setSeenFilter] = useState(filterKey);
  const [rows, setRows] = useState<AsReceptionListItem[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  if (seenFilter !== filterKey) {
    setSeenFilter(filterKey);
    setPage(1);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = { keyword: query.trim(), status };
      setApplied((current) => {
        if (current.keyword === next.keyword && current.status === next.status) {
          return current;
        }
        return next;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, status]);

  useEffect(() => {
    const controller = new AbortController();
    searchTechnicians("", controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setTechnicians(items);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setTechnicians([]);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setRows([]);

    // 화면 페이지는 1부터, Spring Pageable은 0부터 센다.
    fetchReceptions(
      {
        keyword: applied.keyword,
        status: applied.status === "ALL" ? null : applied.status,
        technicianId: typeof technicianId === "number" && Number.isInteger(technicianId) ? technicianId : null,
        page,
        size: PAGE_SIZE,
        sort: `${sortField(sortKey)},${sortDir}`,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        setRows(result.items);
        setPageCount(Math.max(1, result.totalPages));
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) {
          return;
        }
        setRows([]);
        setPageCount(1);
        setError(cause instanceof Error ? cause.message : "A/S 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [applied, page, sortDir, sortKey, technicianId]);

  function onSort(key: string) {
    if (!isSortKey(key)) {
      return;
    }
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const columns: Column<AsReceptionListItem>[] = isTechnician ? technicianColumns : deskColumns;

  return (
    <div>
      {notice !== null && <Notice>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField
          value={query}
          onChange={setQuery}
          placeholder={isTechnician ? "접수번호, 고객명 검색" : "접수번호, 고객명, 증상 검색"}
          className="w-64"
        />
        <SelectBox
          value={status}
          onChange={(value) => {
            if (isStatusFilter(value)) {
              setStatus(value);
            }
          }}
          options={statusOptions}
        />
        {!isTechnician && (
          <SelectBox
            value={assignee}
            onChange={setAssignee}
            options={[
              { value: "ALL", label: "담당 전체" },
              ...technicians.map((item) => ({ value: String(item.id), label: item.name })),
            ]}
          />
        )}
        {isTechnician && (
          <label className="ml-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mineOnly}
              onChange={(event) => setMineOnly(event.target.checked)}
            />
            내 담당 A/S 목록만 보기
          </label>
        )}
        {canCreate && (
          <Button className="ml-auto" onClick={() => navigate("/as/new")}>
            새 접수
          </Button>
        )}
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        emptyText={tableMessage(loading, error)}
        onRowClick={(row) => {
          if (isTechnician) {
            const repair = row.receptionStatus === "REPAIR_IN_PROGRESS"
              || row.receptionStatus === "COMPLETED"
              || row.repairStatus === "REJECTED";
            navigate(repair ? `/as/${row.receptionNumber}/repair` : `/as/${row.receptionNumber}/inspection`);
            return;
          }
          navigate(`/as/details/${row.id}`);
        }}
      />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

function sortField(key: SortKey): string {
  if (key === "customerName") {
    return "customer.name";
  }
  return key;
}

function tableMessage(loading: boolean, error: string): string {
  if (loading) {
    return "A/S 목록을 불러오는 중입니다.";
  }
  if (error !== "") {
    return "A/S 목록을 불러오지 못했습니다.";
  }
  return "조회 결과가 없습니다.";
}

function isStatusFilter(value: string): value is StatusFilter {
  return value === "ALL" || isReceptionStatus(value);
}

function isSortKey(value: string): value is SortKey {
  return value === "receptionNumber" || value === "createdAt" || value === "status" || value === "customerName";
}

function statusText(row: AsReceptionListItem): string {
  if (row.repairStatus === "REJECTED") {
    return "수리 거부";
  }
  return receptionStatusLabel(row.receptionStatus);
}

const deskColumns: Column<AsReceptionListItem>[] = [
  { key: "receptionNumber", header: "접수번호", sortable: true, render: (row) => row.receptionNumber },
  { key: "customerName", header: "고객", sortable: true, render: (row) => row.customerName },
  { key: "phone", header: "연락처", render: (row) => row.customerPhone },
  { key: "modelName", header: "모델", render: (row) => row.modelName ?? "-" },
  { key: "status", header: "상태", sortable: true, render: (row) => statusText(row) },
  { key: "technician", header: "담당", render: (row) => row.technicianName ?? "-" },
  { key: "createdAt", header: "접수일", sortable: true, render: (row) => formatDateTime(row.createdAt) },
];

const technicianColumns: Column<AsReceptionListItem>[] = [
  { key: "receptionNumber", header: "접수번호", sortable: true, render: (row) => row.receptionNumber },
  { key: "customerName", header: "고객", sortable: true, render: (row) => row.customerName },
  { key: "technician", header: "담당 기사", render: (row) => row.technicianName ?? "-" },
  { key: "modelName", header: "모델명", render: (row) => row.modelName ?? "-" },
  { key: "status", header: "상태", sortable: true, render: (row) => statusText(row) },
  { key: "createdAt", header: "접수일", sortable: true, render: (row) => formatDateTime(row.createdAt) },
];
