import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { readNotice } from "@/lib/guards";
import { formatDateTime, won } from "@/lib/format";
import { isAbortError } from "@/lib/apiClient";
import {
  fetchReceptions,
  isReceptionStatus,
  receptionStatusLabel,
  searchTechnicians,
} from "@/lib/asReceptionApi";
import {
  fetchMyRepairs,
  repairStatusLabel,
  warrantyResultLabel,
  type RepairListItem,
  type RepairStatus,
} from "@/lib/repair";
import { useSessionStore } from "@/stores/useSessionStore";
import {
  AS_RECEPTION_STATUSES,
  type AsReceptionListItem,
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
// 기사용 목록: GET /api/v1/as/repairs/my
// ==============================

type RepairStatusFilter = "ALL" | RepairStatus;
type TechSortKey =
  | "receptionNumber"
  | "customerName"
  | "modelName"
  | "diagnosis"
  | "warrantyResult"
  | "status"
  | "finalAmount"
  | "createdAt";

type TechnicianRepairRow = RepairListItem & {
  receptionNumber: string;
  customerName: string;
  modelName: string;
};

const REPAIR_STATUSES: RepairStatus[] = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "DIAGNOSING",
  "REPAIRING",
  "COMPLETED",
];

const repairStatusOptions: { value: RepairStatusFilter; label: string }[] = [
  { value: "ALL", label: "상태 전체" },
  ...REPAIR_STATUSES.map((value) => ({ value, label: repairStatusLabel(value) })),
];

function isRepairStatusFilter(value: string): value is RepairStatusFilter {
  return value === "ALL" || REPAIR_STATUSES.some((item) => item === value);
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

function compareRepair(a: TechnicianRepairRow, b: TechnicianRepairRow, key: TechSortKey): number {
  switch (key) {
    case "receptionNumber":
      return a.receptionNumber.localeCompare(b.receptionNumber);
    case "customerName":
      return a.customerName.localeCompare(b.customerName, "ko");
    case "modelName":
      return a.modelName.localeCompare(b.modelName, "ko");
    case "diagnosis":
      return (a.diagnosis ?? "").localeCompare(b.diagnosis ?? "", "ko");
    case "warrantyResult":
      return warrantyResultLabel(a.warrantyResult).localeCompare(warrantyResultLabel(b.warrantyResult), "ko");
    case "status":
      return a.status.localeCompare(b.status);
    case "finalAmount":
      return a.finalAmount - b.finalAmount;
    case "createdAt":
      return a.createdAt.localeCompare(b.createdAt);
  }
}

async function loadTechnicianRows(signal: AbortSignal): Promise<TechnicianRepairRow[]> {
  const [repairs, receptions] = await Promise.all([
    fetchMyRepairs(signal),
    fetchMyReceptionSummaries(signal),
  ]);
  const byId = new Map(receptions.map((item) => [item.id, item]));
  return repairs.map((repair) => {
    const reception = byId.get(repair.asReceptionId);
    return {
      ...repair,
      receptionNumber: reception?.receptionNumber ?? "-",
      customerName: reception?.customerName ?? "-",
      modelName: reception?.modelName ?? "-",
    };
  });
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

  const [items, setItems] = useState<TechnicianRepairRow[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<RepairStatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<TechSortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 본인에게 배정된 수리 건만 서버가 내려준다 (조건: ROLE_TECHNICIAN)
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

  // 검색 + 상태 필터 + 정렬 (현재 /my가 List만 반환하므로 화면에서 처리)
  const processed = useMemo(() => {
    const keyword = query.trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (status !== "ALL" && item.status !== status) {
        return false;
      }
      if (keyword === "") {
        return true;
      }
      return (
        item.receptionNumber.toLowerCase().includes(keyword) ||
        item.customerName.toLowerCase().includes(keyword) ||
        item.modelName.toLowerCase().includes(keyword) ||
        (item.diagnosis ?? "").toLowerCase().includes(keyword) ||
        (item.workNote ?? "").toLowerCase().includes(keyword)
      );
    });

    const direction = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => compareRepair(a, b, sortKey) * direction);
  }, [items, query, status, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = processed.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function onSort(key: string) {
    if (!isTechSortKey(key)) {
      return;
    }
    setPage(1);
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  const columns: Column<TechnicianRepairRow>[] = [
    {
      key: "receptionNumber",
      header: "접수번호",
      sortable: true,
      render: (row) => row.receptionNumber,
    },
    {
      key: "customerName",
      header: "고객",
      sortable: true,
      render: (row) => row.customerName,
    },
    {
      key: "modelName",
      header: "모델명",
      sortable: true,
      render: (row) => row.modelName,
    },
    {
      key: "diagnosis",
      header: "진단 내용",
      sortable: true,
      render: (row) => (
        <span className="line-clamp-1 max-w-xs">{row.diagnosis ?? "-"}</span>
      ),
    },
    {
      key: "warrantyResult",
      header: "보증",
      sortable: true,
      render: (row) => warrantyResultLabel(row.warrantyResult),
    },
    {
      key: "status",
      header: "진행 상태",
      sortable: true,
      render: (row) => repairStatusLabel(row.status),
    },
    {
      key: "finalAmount",
      header: "수리비",
      sortable: true,
      render: (row) => won(row.finalAmount),
    },
    {
      key: "createdAt",
      header: "배정일",
      sortable: true,
      render: (row) => formatDateTime(row.createdAt),
    },
  ];

  return (
    <div>
      {notice !== null && <Notice>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          placeholder="접수번호, 고객, 진단 내용 검색"
          className="w-64"
        />
        <SelectBox
          value={status}
          onChange={(value) => {
            if (isRepairStatusFilter(value)) {
              setStatus(value);
              setPage(1);
            }
          }}
          options={repairStatusOptions}
        />
        <span className="ml-2 text-sm text-neutral-500">내 담당 A/S만 표시됩니다.</span>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        emptyText={
          loading
            ? "A/S 목록을 불러오는 중입니다."
            : error !== ""
              ? "A/S 목록을 불러오지 못했습니다."
              : "조회 결과가 없습니다."
        }
        onRowClick={(row) => {
          // 수리 진행 상태에 따라 점검 또는 수리 탭으로 이동한다. 주소의 id는 접수 ID다.
          const goRepair =
            row.status === "APPROVED" || row.status === "REPAIRING" || row.status === "COMPLETED" || row.status === "REJECTED";
          navigate(goRepair ? `/as/${row.asReceptionId}/repair` : `/as/${row.asReceptionId}/inspection`);
        }}
      />
      <Pagination page={currentPage} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

// ==============================
// 접수담당자/관리자/매니저용 목록: GET /api/v1/as-receptions (기존 로직)
// ==============================

type StatusFilter = "ALL" | AsReceptionStatus;
type SortKey = "receptionNumber" | "createdAt" | "status" | "customerName";

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
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [assignee, setAssignee] = useState("ALL");
  const [technicians, setTechnicians] = useState<TechnicianSummary[]>([]);
  const [mineOnly, setMineOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState({ keyword: "", status: "ALL" as StatusFilter });
  const showAssignedOnly = isTechnician && mineOnly;
  const technicianId = isTechnician || assignee === "ALL" ? null : Number(assignee);
  const filterKey = `${applied.keyword}:${applied.status}:${technicianId ?? ""}:${showAssignedOnly}:${sortKey}:${sortDir}`;
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

    // 체크를 켰을 때만 기사 전용 목록 API를 사용한다.
    fetchReceptions(
      {
        keyword: applied.keyword,
        status: applied.status === "ALL" ? null : applied.status,
        technicianId:
          typeof technicianId === "number" && Number.isInteger(technicianId)
            ? technicianId
            : null,
        page,
        size: PAGE_SIZE,
        sort: `${sortField(sortKey)},${sortDir}`,
      },
      controller.signal,
      showAssignedOnly,
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
  }, [applied, page, showAssignedOnly, sortDir, sortKey, technicianId]);

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

  return (
    <div>
      {notice !== null && <Notice>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField
          value={query}
          onChange={setQuery}
          placeholder="접수번호, 고객명, 증상 검색"
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
        columns={deskColumns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        emptyText={tableMessage(loading, error)}
        onRowClick={(row) => navigate(`/as/details/${row.id}`)}
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
  return (
    value === "receptionNumber" ||
    value === "createdAt" ||
    value === "status" ||
    value === "customerName"
  );
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
