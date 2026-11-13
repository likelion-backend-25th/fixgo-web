import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useListParams } from "@/hooks/useListParams";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { compareText, readNotice } from "@/lib/guards";
import { formatDateTime } from "@/lib/format";
import { isAbortError } from "@/lib/apiClient";
import {
  fetchReceptions,
  isReceptionStatus,
  receptionStatusColor,
  receptionStatusLabel,
  searchTechnicians,
} from "@/lib/asReceptionApi";
import {
  fetchMyRepairs,
  warrantyResultLabel,
  type RepairListItem,
} from "@/lib/repair";
import { useSessionStore } from "@/stores/useSessionStore";
import {
  AS_RECEPTION_STATUSES,
  type AsReceptionListItem,
  type AsReceptionListQuery,
  type AsReceptionStatus,
  type TechnicianSummary,
} from "@/types/asReception";

const PAGE_SIZE = 20;

// ==============================
// 진입 컴포넌트: 역할별로 화면 분기
// ==============================

export function AsListPage() {
  const user = useSessionStore((state) => state.user);

  // 세션 로딩 전에는 역할을 알 수 없으므로 API 호출 없이 대기
  if (user === null || user === undefined) {
    return <Notice>사용자 정보를 확인하는 중입니다.</Notice>;
  }

  if (user.role === "TECHNICIAN") {
    return <TechnicianAsListPage />;
  }

  return <ReceptionAsListPage />;
}

// ==============================
// 기사용 목록: 내 접수에 수리 기록을 연결한다.
// ==============================

type TechSortKey =
  | "receptionNumber"
  | "customerName"
  | "modelName"
  | "diagnosis"
  | "warrantyResult"
  | "status"
  | "finalAmount"
  | "createdAt";

type TechnicianRepairRow = AsReceptionListItem & {
  repair: RepairListItem | undefined;
};

function readTechSortKey(value: string): TechSortKey {
  return isTechSortKey(value) ? value : "createdAt";
}

function isTechSortKey(value: string): value is TechSortKey {
  return (
    value === "receptionNumber" ||
    value === "customerName" ||
    value === "modelName" ||
    value === "diagnosis" ||
    value === "warrantyResult" ||
    value === "status" ||
    value === "finalAmount" ||
    value === "createdAt"
  );
}

function technicianWarrantyLabel(row: TechnicianRepairRow): string {
  return row.repair === undefined ? "-" : warrantyResultLabel(row.repair.warrantyResult);
}

function compareRepair(a: TechnicianRepairRow, b: TechnicianRepairRow, key: TechSortKey): number {
  switch (key) {
    case "receptionNumber":
      return a.receptionNumber.localeCompare(b.receptionNumber);
    case "customerName":
      return a.customerName.localeCompare(b.customerName, "ko");
    case "modelName":
      return (a.modelName ?? "").localeCompare(b.modelName ?? "", "ko");
    case "diagnosis":
      return (a.repair?.diagnosis ?? "").localeCompare(b.repair?.diagnosis ?? "", "ko");
    case "warrantyResult":
      return technicianWarrantyLabel(a).localeCompare(technicianWarrantyLabel(b), "ko");
    case "status":
      return a.receptionStatus.localeCompare(b.receptionStatus);
    case "finalAmount":
      return (a.repair?.finalAmount ?? -1) - (b.repair?.finalAmount ?? -1);
    case "createdAt":
      return a.createdAt.localeCompare(b.createdAt);
  }
}

async function loadTechnicianRows(signal: AbortSignal): Promise<TechnicianRepairRow[]> {
  const [repairs, receptions] = await Promise.all([
    fetchMyRepairs(signal),
    fetchMyReceptionSummaries(signal),
  ]);
  const repairsByReception = new Map(repairs.map((repair) => [repair.asReceptionId, repair]));
  return receptions.map((reception) => ({
    ...reception,
    repair: repairsByReception.get(reception.id),
  }));
}

async function fetchMyReceptionSummaries(signal: AbortSignal) {
  const size = 100;
  const query = { keyword: "", status: null, technicianId: null, page: 1, size, sort: "createdAt,desc" };
  const first = await fetchReceptions(query, signal, true);
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await fetchReceptions({ ...query, page }, signal, true);
    items.push(...next.items);
  }
  return items;
}

function TechnicianAsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = readNotice(location.state);
  const filters = useListParams();
  const query = filters.text("q");
  const status = filters.text("status", "ALL");
  const receptionStatus = status === "ALL" || isReceptionStatus(status) ? status : "ALL";
  const sortKey = readTechSortKey(filters.text("sort", "createdAt"));
  const sortDir = filters.text("dir") === "asc" ? "asc" : "desc";
  const page = filters.page();

  const [items, setItems] = useState<TechnicianRepairRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 서버가 로그인한 기사에게 배정된 접수와 수리만 반환한다.
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    loadTechnicianRows(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setItems(result);
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) {
          return;
        }
        setItems([]);
        setError(
          cause instanceof Error ? cause.message : "내 담당 A/S 목록을 불러오지 못했습니다.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  // 검색, 상태 필터, 정렬은 합쳐진 목록에 적용한다.
  const processed = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (receptionStatus !== "ALL" && item.receptionStatus !== receptionStatus) {
        return false;
      }
      if (keyword === "") {
        return true;
      }
      return (
        item.receptionNumber.toLowerCase().includes(keyword) ||
        item.customerName.toLowerCase().includes(keyword) ||
        item.customerPhone.toLowerCase().includes(keyword) ||
        (item.modelName ?? "").toLowerCase().includes(keyword)
      );
    });

    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => compareRepair(a, b, sortKey) * direction);
  }, [items, query, receptionStatus, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = processed.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function onSort(key: string) {
    if (!isTechSortKey(key)) {
      return;
    }
    const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    filters.replace({
      sort: key === "createdAt" ? null : key,
      dir: nextDir === "desc" ? null : nextDir,
      page: null,
    });
  }

  return (
    <div>
      {notice !== null && (
        <Notice
          transient
          onDismiss={() => navigate(
            { pathname: location.pathname, search: location.search },
            { replace: true, state: null },
          )}
        >
          {notice}
        </Notice>
      )}
      {error !== "" && <Notice tone="error">{error}</Notice>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField
          value={query}
          onChange={(value) => filters.replace({ q: value, page: null })}
          placeholder="접수번호, 고객명, 증상 검색"
          className="w-64"
        />
        <SelectBox
          value={receptionStatus}
          onChange={(value) => {
            if (value === "ALL" || isReceptionStatus(value)) {
              filters.replace({ status: value === "ALL" ? null : value, page: null });
            }
          }}
          options={statusOptions}
        />
      </div>

      <DataTable
        columns={deskColumns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        tableClassName="min-w-[1100px]"
        emptyText={
          loading
            ? "A/S 목록을 불러오는 중입니다."
            : error !== ""
              ? "A/S 목록을 불러오지 못했습니다."
              : "조회 결과가 없습니다."
        }
        onRowClick={(row) => {
          // 중단된 접수는 점검·수리 화면으로 다시 들어가지 않는다.
          if (row.repairStatus === "REJECTED" && isReturnWaiting(row.receptionStatus)) {
            navigate(`/as/details/${row.id}`);
            return;
          }
          // 수리 진행 상태에 따라 점검 또는 수리 탭으로 이동한다. 주소의 id는 접수 ID다.
          const status = row.repairStatus;
          const goRepair =
            status === "APPROVED" || status === "REPAIRING" || status === "COMPLETED" || status === "REJECTED";
          navigate(goRepair ? `/as/${row.id}/repair` : `/as/${row.id}/inspection`);
        }}
      />
      <Pagination page={currentPage} pageCount={pageCount} onPageChange={filters.setPage} />
    </div>
  );
}

// ==============================
// 접수담당자/관리자/매니저용 목록: GET /api/v1/as-receptions (기존 로직)
// ==============================

type StatusFilter = "ALL" | AsReceptionStatus;
type SortKey = "receptionNumber" | "createdAt" | "status" | "customerName" | "modelName";

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "상태 전체" },
  ...AS_RECEPTION_STATUSES.map((status) => ({
    value: status,
    label: receptionStatusLabel(status),
  })),
];

function ReceptionAsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const isTechnician = user?.role === "TECHNICIAN";
  const canCreate =
    user?.role === "ADMIN" || user?.role === "RECEPTIONIST" || user?.role === "MANAGER";
  const notice = readNotice(location.state);
  const filters = useListParams();
  const query = filters.text("q");
  const status = readReceptionStatusFilter(filters.text("status", "ALL"));
  const assignee = filters.text("assignee", "ALL");
  const mineOnly = filters.text("mine") === "1";
  const sortKey = readReceptionSortKey(filters.text("sort", "createdAt"));
  const sortDir = filters.text("dir") === "asc" ? "asc" : "desc";
  const page = filters.page();
  const [technicians, setTechnicians] = useState<TechnicianSummary[]>([]);
  const [applied, setApplied] = useState({ keyword: query.trim(), status });
  const showAssignedOnly = isTechnician && mineOnly;
  const technicianId = isTechnician || assignee === "ALL" ? null : Number(assignee);
  const [rows, setRows] = useState<AsReceptionListItem[]>([]);
  const [modelSorted, setModelSorted] = useState<AsReceptionListItem[] | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // 담당 기사 필터용 직원 목록 (이 컴포넌트는 기사 계정에서는 렌더링되지 않는다)
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
    if (sortKey !== "modelName") {
      setModelSorted(null);
    }

    const listQuery = {
      keyword: applied.keyword,
      status: applied.status === "ALL" ? null : applied.status,
      technicianId:
        typeof technicianId === "number" && Number.isInteger(technicianId)
          ? technicianId
          : null,
    };

    // 모델 정렬은 목록 API가 지원하지 않아, 조건에 맞는 접수를 모아 화면에서 정렬한다.
    const request = sortKey === "modelName"
      ? fetchReceptionsSortedByModel(listQuery, sortDir, controller.signal, showAssignedOnly)
      : fetchReceptions(
          {
            ...listQuery,
            page,
            size: PAGE_SIZE,
            sort: `${sortField(sortKey)},${sortDir}`,
          },
          controller.signal,
          showAssignedOnly,
        ).then((result) => ({ items: result.items, pageCount: Math.max(1, result.totalPages) }));

    request
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }
        if (sortKey === "modelName") {
          setModelSorted(result.items);
          setPageCount(result.pageCount);
          return;
        }
        setModelSorted(null);
        setRows(result.items);
        setPageCount(result.pageCount);
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) {
          return;
        }
        setRows([]);
        setModelSorted(null);
        setPageCount(1);
        setError(cause instanceof Error ? cause.message : "A/S 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [applied, page, showAssignedOnly, sortDir, sortKey, technicianId]);

  function onSort(key: string) {
    if (!isSortKey(key)) {
      return;
    }
    const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    filters.replace({
      sort: key === "createdAt" ? null : key,
      dir: nextDir === "desc" ? null : nextDir,
      page: null,
    });
  }

  return (
    <div>
      {notice !== null && (
        <Notice
          transient
          onDismiss={() => navigate(
            { pathname: location.pathname, search: location.search },
            { replace: true, state: null },
          )}
        >
          {notice}
        </Notice>
      )}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField
          value={query}
          onChange={(value) => filters.replace({ q: value, page: null })}
          placeholder="접수번호, 고객명, 증상 검색"
          className="w-64"
        />
        <SelectBox
          value={status}
          onChange={(value) => {
            if (isStatusFilter(value)) {
              filters.replace({ status: value === "ALL" ? null : value, page: null });
            }
          }}
          options={statusOptions}
        />
        {!isTechnician && (
          <SelectBox
            value={assignee}
            onChange={(value) => filters.replace({ assignee: value === "ALL" ? null : value, page: null })}
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
              onChange={(event) => filters.replace({ mine: event.target.checked ? "1" : null, page: null })}
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
        columns={deskColumns}
        rows={visibleRows(rows, modelSorted, page)}
        rowKey={(row) => String(row.id)}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        emptyText={tableMessage(loading, error)}
        tableClassName="min-w-[1100px]"
        onRowClick={(row) => navigate(`/as/details/${row.id}`)}
      />
      <Pagination page={page} pageCount={pageCount} onPageChange={filters.setPage} />
    </div>
  );
}

function readReceptionStatusFilter(value: string): StatusFilter {
  return isStatusFilter(value) ? value : "ALL";
}

function readReceptionSortKey(value: string): SortKey {
  return isSortKey(value) ? value : "createdAt";
}

function sortField(key: Exclude<SortKey, "modelName">): string {
  if (key === "customerName") {
    return "customer.name";
  }
  return key;
}

function visibleRows(
  rows: AsReceptionListItem[],
  modelSorted: AsReceptionListItem[] | null,
  page: number,
): AsReceptionListItem[] {
  if (modelSorted === null) {
    return rows;
  }
  const start = (page - 1) * PAGE_SIZE;
  return modelSorted.slice(start, start + PAGE_SIZE);
}

async function fetchReceptionsSortedByModel(
  query: Pick<AsReceptionListQuery, "keyword" | "status" | "technicianId">,
  sortDir: "asc" | "desc",
  signal: AbortSignal,
  mineOnly: boolean,
): Promise<{ items: AsReceptionListItem[]; pageCount: number }> {
  const size = 100;
  const first = await fetchReceptions(
    { ...query, page: 1, size, sort: "createdAt,desc" },
    signal,
    mineOnly,
  );
  const items = [...first.items];
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await fetchReceptions(
      { ...query, page, size, sort: "createdAt,desc" },
      signal,
      mineOnly,
    );
    items.push(...next.items);
  }
  const direction = sortDir === "asc" ? 1 : -1;
  items.sort((left, right) => compareText(left.modelName ?? "", right.modelName ?? "") * direction);
  return {
    items,
    pageCount: Math.max(1, Math.ceil(items.length / PAGE_SIZE)),
  };
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
  return (
    value === "receptionNumber" ||
    value === "createdAt" ||
    value === "status" ||
    value === "customerName" ||
    value === "modelName"
  );
}

function statusText(row: AsReceptionListItem): string {
  return receptionStatusLabel(row.receptionStatus);
}

function isReturnWaiting(status: AsReceptionListItem["receptionStatus"]): boolean {
  return status === "AWAITING_SHIPMENT" || status === "AWAITING_PICKUP";
}

const deskColumns: Column<AsReceptionListItem>[] = [
  {
    key: "receptionNumber",
    header: "접수번호",
    width: "18%",
    sortable: true,
    render: (row) => <span className="text-[#005A9C]">{row.receptionNumber}</span>,
  },
  { key: "customerName", header: "고객명", width: "10%", sortable: true, render: (row) => row.customerName },
  { key: "phone", header: "연락처", width: "17%", render: (row) => row.customerPhone },
  { key: "modelName", header: "모델명", width: "17%", sortable: true, render: (row) => row.modelName ?? "-" },
  {
    key: "status",
    header: "상태",
    width: "13%",
    className: "text-center whitespace-nowrap",
    sortable: true,
    render: (row) => <span className={receptionStatusColor(row.receptionStatus)}>{statusText(row)}</span>,
  },
  {
    key: "technician",
    header: "담당 기사",
    width: "10%",
    className: "text-center whitespace-nowrap",
    render: (row) => row.technicianName ?? "-",
  },
  {
    key: "createdAt",
    header: "접수일",
    width: "15%",
    className: "text-center whitespace-nowrap",
    sortable: true,
    render: (row) => formatDateTime(row.createdAt),
  },
];
