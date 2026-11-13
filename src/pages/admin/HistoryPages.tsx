import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import {
  fetchStatusHistories,
  fetchTechnicianHistories,
  historyStatusLabel,
  receptionStatusLabel,
} from "@/lib/asReceptionApi";
import { formatDateTime } from "@/lib/format";
import { AS_RECEPTION_STATUSES, REPAIR_STATUSES, type AsReceptionStatus, type StatusHistoryListItem, type TechnicianHistoryListItem } from "@/types/asReception";

const PAGE_SIZE = 20;

const statusOptions: { value: string; label: string }[] = [
  { value: "", label: "전체" },
  ...AS_RECEPTION_STATUSES.map((status) => ({ value: status, label: receptionStatusLabel(status) })),
  ...REPAIR_STATUSES
    .filter((status) => !AS_RECEPTION_STATUSES.includes(status as AsReceptionStatus))
    .map((status) => ({ value: status, label: historyStatusLabel(status) })),
];

export function AllocationHistoryPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<TechnicianHistoryListItem[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setApplied(query.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchTechnicianHistories({ keyword: applied, page, size: PAGE_SIZE }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setRows(result.items);
        setPageCount(Math.max(1, result.totalPages));
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) return;
        setRows([]);
        setPageCount(1);
        setError(cause instanceof Error ? cause.message : "기사 배정 이력을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [applied, page]);

  const columns: Column<TechnicianHistoryListItem>[] = [
    {
      key: "as",
      header: "접수번호",
      render: (row) => <span className="text-[#005A9C]">{row.receptionNumber}</span>,
    },
    { key: "customer", header: "고객명", render: (row) => row.customerName },
    { key: "model", header: "모델", render: (row) => row.modelName ?? "-" },
    { key: "category", header: "구분", render: (row) => row.previousTechnicianName === null ? "최초 배정" : "변경" },
    { key: "before", header: "이전기사", render: (row) => row.previousTechnicianName ?? "-" },
    { key: "after", header: "변경기사", render: (row) => row.newTechnicianName ?? "-" },
    { key: "actor", header: "변경자", render: (row) => row.changedBy ?? "-" },
    { key: "reason", header: "사유", render: (row) => row.reason ?? "-" },
    { key: "at", header: "일시", render: (row) => formatDateTime(row.createdAt) },
  ];

  return (
    <div>
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <TextField value={query} onChange={setQuery} placeholder="접수번호, 고객, 기사, 사유 검색" className="mb-4 w-72" />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        onRowClick={(row) => navigate(`/as/details/${row.receptionId}`)}
        emptyText={loading ? "기사 배정 이력을 불러오는 중입니다." : "기사 배정 이력이 없습니다."}
      />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}

export function StatusHistoryPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState({ keyword: "", status: "" });
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<StatusHistoryListItem[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setApplied({ keyword: query.trim(), status });
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, status]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchStatusHistories(
      { keyword: applied.keyword, toStatus: applied.status === "" ? null : applied.status, page, size: PAGE_SIZE },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setRows(result.items);
        setPageCount(Math.max(1, result.totalPages));
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) return;
        setRows([]);
        setPageCount(1);
        setError(cause instanceof Error ? cause.message : "상태 변경 이력을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [applied, page]);

  const columns: Column<StatusHistoryListItem>[] = [
    {
      key: "as",
      header: "접수번호",
      render: (row) => <span className="text-[#005A9C]">{row.receptionNumber}</span>,
    },
    { key: "customer", header: "고객명", render: (row) => row.customerName },
    { key: "model", header: "모델", render: (row) => row.modelName ?? "-" },
    { key: "before", header: "이전 상태", render: (row) => historyStatusLabel(row.fromStatus) },
    { key: "after", header: "변경 상태", render: (row) => historyStatusLabel(row.toStatus) },
    { key: "actor", header: "변경자", render: (row) => row.changedBy ?? "-" },
    { key: "reason", header: "사유", render: (row) => row.reason ?? "-" },
    { key: "at", header: "일시", render: (row) => formatDateTime(row.createdAt) },
  ];

  return (
    <div>
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <div className="mb-4 flex gap-2">
        <TextField value={query} onChange={setQuery} placeholder="접수번호, 고객명, 사유 검색" className="w-64" />
        <SelectBox
          value={status}
          onChange={setStatus}
          options={statusOptions}
        />
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        onRowClick={(row) => navigate(`/as/details/${row.receptionId}`)}
        emptyText={loading ? "상태 변경 이력을 불러오는 중입니다." : "상태 변경 이력이 없습니다."}
      />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
    </div>
  );
}
