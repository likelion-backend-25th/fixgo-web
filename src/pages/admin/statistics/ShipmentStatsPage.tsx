import { useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useListParams } from "@/hooks/useListParams";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { SortMenu } from "@/components/ui/SortMenu";
import { formatDate, includesText } from "@/lib/format";
import { compareText } from "@/lib/guards";
import { shipmentMethodLabel, shipmentStatusClass } from "@/lib/shipmentApi";
import { fetchShipmentHistory } from "@/lib/statisticsApi";
import { PeriodFilter, StatisticsBackLink } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPage } from "@/pages/admin/statistics/useStatisticsPage";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
import { useStatisticsResource } from "@/pages/admin/statistics/useStatisticsResource";
import type { ShipmentHistoryItem, ShipmentHistoryMethod } from "@/types/statistics";

type ShipmentListStatus =
  | "배송 등록 대기"
  | "배송 준비 완료"
  | "배송 중"
  | "배송 완료"
  | "방문 수령 대기"
  | "방문 수령 완료";
type ShipmentFilter = "ALL" | ShipmentListStatus;
type MethodFilter = "ALL" | ShipmentHistoryMethod;
type ShipmentSortKey = "number" | "customer" | "method" | "status" | "date";

const methodFilters: { value: MethodFilter; label: string }[] = [
  { value: "ALL", label: "수령 방법 전체" },
  { value: "DELIVERY", label: "택배" },
  { value: "PICKUP", label: "방문 수령" },
];

const shipmentFilters: { value: ShipmentFilter; label: string }[] = [
  { value: "ALL", label: "상태 전체" },
  { value: "배송 등록 대기", label: "배송 등록 대기" },
  { value: "배송 준비 완료", label: "배송 준비 완료" },
  { value: "배송 중", label: "배송 중" },
  { value: "배송 완료", label: "배송 완료" },
  { value: "방문 수령 대기", label: "방문 수령 대기" },
  { value: "방문 수령 완료", label: "방문 수령 완료" },
];

export function ShipmentStatsPage() {
  const { startDate, endDate, invalid } = useStatisticsPeriod();
  const history = useStatisticsResource(fetchShipmentHistory, startDate, endDate, invalid);
  const summary = history.data === null ? null : summarizeShipmentMethods(history.data);
  return (
    <div>
      <StatisticsBackLink />
      <PeriodFilter />
      {history.error !== "" && <Notice tone="error">{history.error}</Notice>}
      <div className="grid gap-3 lg:grid-cols-2">
        <MethodPanel
          title="택배"
          loading={history.loading}
          metrics={[
            ["대기", summary?.delivery.ready],
            ["배송중", summary?.delivery.shipping],
            ["완료", summary?.delivery.completed],
          ]}
        />
        <MethodPanel
          title="방문 수령"
          loading={history.loading}
          metrics={[
            ["대기", summary?.pickup.ready],
            ["완료", summary?.pickup.completed],
          ]}
        />
      </div>
      <ShipmentHistorySection history={history} />
    </div>
  );
}

function ShipmentHistorySection({
  history,
}: {
  history: { data: ShipmentHistoryItem[] | null; loading: boolean; error: string };
}) {
  const navigate = useNavigate();
  const filters = useListParams();
  const { startDate, endDate } = useStatisticsPeriod();
  const status = readShipmentFilter(filters.text("status", "ALL"));
  const method = readMethodFilter(filters.text("method", "ALL"));
  const appliedKeyword = filters.text("q");
  const [keyword, setKeyword] = useState(appliedKeyword);
  const sortKey = readShipmentSort(filters.text("sort"));
  const sortDir = filters.text("dir") === "desc" ? "desc" : "asc";
  const rows = useMemo(
    () => sortShipments(filterShipments(history.data ?? [], status, method, appliedKeyword), sortKey, sortDir),
    [appliedKeyword, history.data, method, sortDir, sortKey, status],
  );
  const list = useStatisticsPage(
    rows,
    `${startDate}|${endDate}|${status}|${method}|${appliedKeyword}|${sortKey ?? ""}|${sortDir}`,
  );

  function toggleSort(key: ShipmentSortKey) {
    const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    filters.replace({ sort: key, dir: nextDir, page: null });
  }
  return (
    <section className="mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">배송 목록</h2>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            filters.replace({ q: keyword.trim(), page: null });
          }}
        >
          <TextField value={keyword} onChange={setKeyword} placeholder="접수번호, 고객명" className="w-48" />
          <Button type="submit">검색</Button>
          <SelectBox value={method} onChange={(value) => {
            const next = readMethodFilter(value);
            filters.replace({ method: next === "ALL" ? null : next, page: null });
          }} options={methodFilters} />
          <SelectBox value={status} onChange={(value) => {
            const next = readShipmentFilter(value);
            filters.replace({ status: next === "ALL" ? null : next, page: null });
          }} options={shipmentFilters} />
        </form>
      </div>
      <DataTable
        columns={shipmentColumns(sortKey, sortDir, toggleSort)}
        rows={list.visible}
        rowKey={(row) => String(row.shipmentId)}
        onRowClick={(row) => navigate(`/as/details/${row.receptionId}`)}
        emptyText={shipmentEmptyText(history.loading, history.error)}
      />
      <Pagination page={list.page} pageCount={list.pageCount} onPageChange={list.setPage} />
    </section>
  );
}

function shipmentColumns(
  sortKey: ShipmentSortKey | null,
  sortDir: "asc" | "desc",
  toggleSort: (key: ShipmentSortKey) => void,
): Column<ShipmentHistoryItem>[] {
  return [
    shipmentColumn("number", "접수번호", sortKey, sortDir, toggleSort, (row) => row.receptionNumber),
    shipmentColumn("customer", "고객", sortKey, sortDir, toggleSort, (row) => row.customerName),
    shipmentColumn("method", "방식", sortKey, sortDir, toggleSort, (row) => shipmentMethodLabel(row.returnMethod)),
    shipmentColumn("status", "상태", sortKey, sortDir, toggleSort, (row) => {
      const status = historyListStatus(row);
      return status === null ? "-" : <span className={shipmentStatusClass(status)}>{status}</span>;
    }),
    shipmentColumn("date", "등록일", sortKey, sortDir, toggleSort, (row) => formatDate(row.createdAt)),
  ];
}

function shipmentColumn(
  key: ShipmentSortKey,
  label: string,
  sortKey: ShipmentSortKey | null,
  sortDir: "asc" | "desc",
  toggleSort: (key: ShipmentSortKey) => void,
  render: (row: ShipmentHistoryItem) => ReactNode,
): Column<ShipmentHistoryItem> {
  return {
    key,
    header: <SortMenu label={label} active={sortKey === key} direction={sortDir} onToggle={() => toggleSort(key)} />,
    render,
  };
}

function sortShipments(
  rows: ShipmentHistoryItem[],
  sortKey: ShipmentSortKey | null,
  sortDir: "asc" | "desc",
): ShipmentHistoryItem[] {
  if (sortKey === null) {
    return rows;
  }
  const direction = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => compareShipment(left, right, sortKey, direction));
}

function compareShipment(
  left: ShipmentHistoryItem,
  right: ShipmentHistoryItem,
  sortKey: ShipmentSortKey,
  direction: number,
): number {
  if (sortKey === "number") {
    return compareText(left.receptionNumber, right.receptionNumber) * direction;
  }
  if (sortKey === "customer") {
    return compareText(left.customerName, right.customerName) * direction;
  }
  if (sortKey === "method") {
    return compareText(shipmentMethodLabel(left.returnMethod), shipmentMethodLabel(right.returnMethod)) * direction;
  }
  if (sortKey === "status") {
    return compareText(historyListStatus(left) ?? "", historyListStatus(right) ?? "") * direction;
  }
  return compareOptionalText(left.createdAt, right.createdAt, direction);
}

function compareOptionalText(left: string | null, right: string | null, direction: number): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return compareText(left, right) * direction;
}

function filterShipments(
  rows: ShipmentHistoryItem[],
  status: ShipmentFilter,
  method: MethodFilter,
  keyword: string,
): ShipmentHistoryItem[] {
  return rows.filter((row) => {
    const statusMatched = status === "ALL" || historyListStatus(row) === status;
    const methodMatched = method === "ALL" || row.returnMethod === method;
    const keywordMatched = includesText(row.receptionNumber, keyword) || includesText(row.customerName, keyword);
    return statusMatched && methodMatched && keywordMatched;
  });
}

function readShipmentSort(value: string): ShipmentSortKey | null {
  if (value === "number" || value === "customer" || value === "method" || value === "status" || value === "date") {
    return value;
  }
  return null;
}

function readMethodFilter(value: string): MethodFilter {
  if (value === "DELIVERY" || value === "PICKUP") {
    return value;
  }
  return "ALL";
}

function readShipmentFilter(value: string): ShipmentFilter {
  if (
    value === "배송 등록 대기"
    || value === "배송 준비 완료"
    || value === "배송 중"
    || value === "배송 완료"
    || value === "방문 수령 대기"
    || value === "방문 수령 완료"
  ) {
    return value;
  }
  return "ALL";
}

function historyListStatus(row: ShipmentHistoryItem): ShipmentListStatus | null {
  if (row.returnMethod === "DELIVERY" && row.status === "READY") {
    return "배송 준비 완료";
  }
  if (row.returnMethod === "DELIVERY" && row.status === "SHIPPING") {
    return "배송 중";
  }
  if (row.returnMethod === "DELIVERY" && row.status === "DELIVERED") {
    return "배송 완료";
  }
  if (row.returnMethod === "PICKUP" && row.status === "READY") {
    return "방문 수령 대기";
  }
  if (row.returnMethod === "PICKUP" && row.status === "PICKED_UP") {
    return "방문 수령 완료";
  }
  return null;
}

function shipmentEmptyText(loading: boolean, error: string): string {
  if (loading) {
    return "조회 중";
  }
  if (error !== "") {
    return "배송 내역을 불러오지 못했습니다.";
  }
  return "해당 기간의 배송 내역이 없습니다.";
}

export function summarizeShipmentMethods(rows: ShipmentHistoryItem[]): {
  delivery: { ready: number; shipping: number; completed: number };
  pickup: { ready: number; completed: number };
} {
  const delivery = { ready: 0, shipping: 0, completed: 0 };
  const pickup = { ready: 0, completed: 0 };
  for (const row of rows) {
    if (row.returnMethod === "PICKUP") {
      if (row.status === "READY") {
        pickup.ready += 1;
      } else {
        pickup.completed += 1;
      }
      continue;
    }
    if (row.status === "READY") {
      delivery.ready += 1;
    } else if (row.status === "SHIPPING") {
      delivery.shipping += 1;
    } else {
      delivery.completed += 1;
    }
  }
  return { delivery, pickup };
}

function MethodPanel({
  title,
  loading,
  metrics,
}: {
  title: string;
  loading: boolean;
  metrics: [string, number | undefined][];
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-medium text-neutral-700">{title}</h2>
      <div className={`mt-3 grid gap-3 ${metrics.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {metrics.map(([label, value]) => (
          <div key={label}>
            <p className="text-sm text-neutral-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-blue-600">{loading ? "조회 중" : count(value)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function count(value: number | undefined): string {
  return value === undefined ? "-" : `${value.toLocaleString("ko-KR")}건`;
}
