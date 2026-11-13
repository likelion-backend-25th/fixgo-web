import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { useListParams } from "@/hooks/useListParams";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { SortMenu } from "@/components/ui/SortMenu";
import { isAbortError } from "@/lib/apiClient";
import { formatDate, includesText, won } from "@/lib/format";
import { compareText } from "@/lib/guards";
import { fetchDepositWaiting, paymentBillStatusLabel, type PaymentListItem } from "@/lib/paymentApi";
import { fetchPaymentHistory, fetchPaymentStatistics } from "@/lib/statisticsApi";
import type { PaymentHistoryItem, PaymentHistoryStatus } from "@/types/statistics";
import { PeriodFilter, StatisticsBackLink } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPage } from "@/pages/admin/statistics/useStatisticsPage";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
import { useStatisticsResource } from "@/pages/admin/statistics/useStatisticsResource";

type DepositSortKey = "number" | "customer" | "model" | "amount" | "billed" | "elapsed" | "status";

export function DepositWaitingPage() {
  const filters = useListParams();
  const appliedKeyword = filters.text("q");
  const [keyword, setKeyword] = useState(appliedKeyword);
  const sortKey = readDepositSort(filters.text("sort"));
  const sortDir = filters.text("dir") === "desc" ? "desc" : "asc";
  const [bills, setBills] = useState<PaymentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetchDepositWaiting(controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setBills(items);
        }
      })
      .catch((reason: unknown) => {
        if (isAbortError(reason) || controller.signal.aborted) {
          return;
        }
        setError(reason instanceof Error ? reason.message : "입금 대기 내역을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  const filtered = useMemo(
    () => sortDeposits(filterDeposits(bills, appliedKeyword), sortKey, sortDir),
    [appliedKeyword, bills, sortDir, sortKey],
  );
  const list = useStatisticsPage(filtered, `${appliedKeyword}|${sortKey ?? ""}|${sortDir}`);
  const total = filtered.reduce((sum, row) => sum + row.amount, 0);

  function toggleSort(key: DepositSortKey) {
    const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    filters.replace({ sort: key, dir: nextDir, page: null });
  }

  return (
    <div>
      <StatisticsBackLink />
      <form
        className="mb-4 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          filters.replace({ q: keyword.trim(), page: null });
        }}
      >
        <TextField value={keyword} onChange={setKeyword} placeholder="접수번호, 고객명" className="w-48" />
        <Button type="submit">검색</Button>
      </form>
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <p className="mb-3 text-sm text-neutral-700">
        대기 {loading ? "조회 중" : `${filtered.length.toLocaleString("ko-KR")}건`} 합계 {loading ? "조회 중" : won(total)}
      </p>
      <DataTable
        columns={depositColumns(sortKey, sortDir, toggleSort)}
        rows={list.visible}
        rowKey={(row) => String(row.billId)}
        emptyText={loading ? "입금 대기 내역을 불러오는 중입니다." : "조회 결과가 없습니다."}
      />
      <p className="mt-3 text-sm font-medium text-neutral-800">합계 {loading ? "조회 중" : won(total)}</p>
      <Pagination page={list.page} pageCount={list.pageCount} onPageChange={list.setPage} />
    </div>
  );
}

function depositColumns(
  sortKey: DepositSortKey | null,
  sortDir: "asc" | "desc",
  toggleSort: (key: DepositSortKey) => void,
): Column<PaymentListItem>[] {
  return [
    column("number", "접수번호", sortKey, sortDir, toggleSort, (row) => row.asReceptionNumber),
    column("customer", "고객", sortKey, sortDir, toggleSort, (row) => row.customerName),
    column("model", "모델", sortKey, sortDir, toggleSort, (row) => row.modelName ?? "-"),
    column("amount", "견적금액", sortKey, sortDir, toggleSort, (row) => won(row.amount)),
    column("billed", "청구일", sortKey, sortDir, toggleSort, (row) => formatDate(row.billedAt)),
    column("elapsed", "경과일", sortKey, sortDir, toggleSort, (row) => elapsedLabel(row.billedAt)),
    column("status", "상태", sortKey, sortDir, toggleSort, (row) => (
      <span className="text-orange-500">{depositStatusLabel(row.status)}</span>
    )),
  ];
}

function readDepositSort(value: string): DepositSortKey | null {
  if (
    value === "number"
    || value === "customer"
    || value === "model"
    || value === "amount"
    || value === "billed"
    || value === "elapsed"
    || value === "status"
  ) {
    return value;
  }
  return null;
}

function column(
  key: DepositSortKey,
  label: string,
  sortKey: DepositSortKey | null,
  sortDir: "asc" | "desc",
  toggleSort: (key: DepositSortKey) => void,
  render: (row: PaymentListItem) => ReactNode,
): Column<PaymentListItem> {
  return {
    key,
    header: <SortMenu label={label} active={sortKey === key} direction={sortDir} onToggle={() => toggleSort(key)} />,
    render,
  };
}

function filterDeposits(rows: PaymentListItem[], keyword: string): PaymentListItem[] {
  return rows.filter((row) => includesText(row.asReceptionNumber, keyword) || includesText(row.customerName, keyword));
}

function elapsedDays(billedAt: string | null): number | null {
  if (billedAt === null) {
    return null;
  }
  const billed = new Date(`${billedAt.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(billed.getTime())) {
    return null;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - billed.getTime()) / 86_400_000));
}

function elapsedLabel(billedAt: string | null): string {
  const days = elapsedDays(billedAt);
  return days === null ? "-" : `${days}일`;
}

function depositStatusLabel(status: PaymentListItem["status"]): string {
  return status === "UNPAID" ? "미입금" : paymentBillStatusLabel(status);
}

function sortDeposits(
  rows: PaymentListItem[],
  sortKey: DepositSortKey | null,
  sortDir: "asc" | "desc",
): PaymentListItem[] {
  if (sortKey === null) {
    return rows;
  }
  const direction = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => compareDeposit(left, right, sortKey, direction));
}

function compareDeposit(
  left: PaymentListItem,
  right: PaymentListItem,
  sortKey: DepositSortKey,
  direction: number,
): number {
  if (sortKey === "number") {
    return compareText(left.asReceptionNumber, right.asReceptionNumber) * direction;
  }
  if (sortKey === "customer") {
    return compareText(left.customerName, right.customerName) * direction;
  }
  if (sortKey === "model") {
    return compareText(left.modelName ?? "", right.modelName ?? "") * direction;
  }
  if (sortKey === "amount") {
    return (left.amount - right.amount) * direction;
  }
  if (sortKey === "billed") {
    return compareOptional(left.billedAt, right.billedAt, direction);
  }
  if (sortKey === "elapsed") {
    return compareOptionalNumber(elapsedDays(left.billedAt), elapsedDays(right.billedAt), direction);
  }
  return compareText(depositStatusLabel(left.status), depositStatusLabel(right.status)) * direction;
}

function compareOptional(left: string | null, right: string | null, direction: number): number {
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

function compareOptionalNumber(left: number | null, right: number | null, direction: number): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return (left - right) * direction;
}

export function RepairCostPage() {
  const payment = usePaymentSummary();
  return (
    <div>
      <StatisticsBackLink />
      <PeriodFilter />
      {payment.error !== "" && <Notice tone="error">{payment.error}</Notice>}
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="수납" value={payment.loading ? "조회 중" : money(payment.data?.totalPaidAmount)} hint="승인 완료" />
        <SummaryCard label="환불" value={payment.loading ? "조회 중" : money(payment.data?.totalRefundAmount)} hint="환불 완료" />
        <SummaryCard label="순수납" value={payment.loading ? "조회 중" : money(payment.data?.netCollectedAmount)} hint="수납에서 환불을 뺀 금액" />
        <SummaryCard label="현재 미입금" value={payment.loading ? "조회 중" : count(payment.data?.unpaidCount)} hint="청구서 기준" />
      </div>
      <PaymentHistorySection />
    </div>
  );
}

type HistoryFilter = "ALL" | PaymentHistoryStatus;
type HistorySortKey = "number" | "customer" | "amount" | "status" | "date";

const historyFilters: { value: HistoryFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "PAID", label: "입금" },
  { value: "UNPAID", label: "미입금" },
  { value: "REFUNDED", label: "환불" },
];

function PaymentHistorySection() {
  const navigate = useNavigate();
  const filters = useListParams();
  const { startDate, endDate, invalid } = useStatisticsPeriod();
  const history = useStatisticsResource(fetchPaymentHistory, startDate, endDate, invalid);
  const status = readHistoryFilter(filters.text("status", "ALL"));
  const appliedKeyword = filters.text("q");
  const [keyword, setKeyword] = useState(appliedKeyword);
  const sortKey = readHistorySort(filters.text("sort"));
  const sortDir = filters.text("dir") === "desc" ? "desc" : "asc";
  const rows = useMemo(
    () => sortHistory(filterHistory(history.data ?? [], status, appliedKeyword), sortKey, sortDir),
    [appliedKeyword, history.data, sortDir, sortKey, status],
  );
  const list = useStatisticsPage(rows, `${startDate}|${endDate}|${status}|${appliedKeyword}|${sortKey ?? ""}|${sortDir}`);

  function toggleSort(key: HistorySortKey) {
    const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    filters.replace({ sort: key, dir: nextDir, page: null });
  }
  return (
    <section className="mt-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-title">결제 내역</h2>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            filters.replace({ q: keyword.trim(), page: null });
          }}
        >
          <TextField value={keyword} onChange={setKeyword} placeholder="접수번호, 고객명" className="w-48" />
          <Button type="submit">검색</Button>
          <SelectBox value={status} onChange={(value) => {
            const next = readHistoryFilter(value);
            filters.replace({ status: next === "ALL" ? null : next, page: null });
          }} options={historyFilters} />
        </form>
      </div>
      {history.error !== "" && <Notice tone="error">{history.error}</Notice>}
      <DataTable
        columns={historyColumns(sortKey, sortDir, toggleSort)}
        rows={list.visible}
        rowKey={(row) => `${row.status}-${row.billId}-${row.occurredAt ?? ""}`}
        onRowClick={(row) => navigate(`/payment/${row.billId}`)}
        emptyText={historyEmptyText(history.loading, history.error)}
      />
      <Pagination page={list.page} pageCount={list.pageCount} onPageChange={list.setPage} />
    </section>
  );
}

function historyColumns(
  sortKey: HistorySortKey | null,
  sortDir: "asc" | "desc",
  toggleSort: (key: HistorySortKey) => void,
): Column<PaymentHistoryItem>[] {
  return [
    historyColumn("number", "접수번호", sortKey, sortDir, toggleSort, (row) => row.receptionNumber),
    historyColumn("customer", "고객", sortKey, sortDir, toggleSort, (row) => row.customerName),
    historyColumn("amount", "금액", sortKey, sortDir, toggleSort, (row) => won(row.amount)),
    historyColumn("status", "상태", sortKey, sortDir, toggleSort, (row) => (
      <span className={historyStatusClass(row.status)}>{historyStatusLabel(row.status)}</span>
    )),
    historyColumn("date", "일자", sortKey, sortDir, toggleSort, (row) => formatDate(row.occurredAt)),
  ];
}

function historyColumn(
  key: HistorySortKey,
  label: string,
  sortKey: HistorySortKey | null,
  sortDir: "asc" | "desc",
  toggleSort: (key: HistorySortKey) => void,
  render: (row: PaymentHistoryItem) => ReactNode,
): Column<PaymentHistoryItem> {
  return {
    key,
    header: <SortMenu label={label} active={sortKey === key} direction={sortDir} onToggle={() => toggleSort(key)} />,
    render,
  };
}

function sortHistory(
  rows: PaymentHistoryItem[],
  sortKey: HistorySortKey | null,
  sortDir: "asc" | "desc",
): PaymentHistoryItem[] {
  if (sortKey === null) {
    return rows;
  }
  const direction = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => compareHistory(left, right, sortKey, direction));
}

function compareHistory(
  left: PaymentHistoryItem,
  right: PaymentHistoryItem,
  sortKey: HistorySortKey,
  direction: number,
): number {
  if (sortKey === "number") {
    return compareText(left.receptionNumber, right.receptionNumber) * direction;
  }
  if (sortKey === "customer") {
    return compareText(left.customerName, right.customerName) * direction;
  }
  if (sortKey === "amount") {
    return (left.amount - right.amount) * direction;
  }
  if (sortKey === "status") {
    return compareText(historyStatusLabel(left.status), historyStatusLabel(right.status)) * direction;
  }
  return compareOptionalText(left.occurredAt, right.occurredAt, direction);
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

function historyEmptyText(loading: boolean, error: string): string {
  if (loading) {
    return "조회 중";
  }
  if (error !== "") {
    return "결제 내역을 불러오지 못했습니다.";
  }
  return "해당 기간의 결제 내역이 없습니다.";
}

function filterHistory(rows: PaymentHistoryItem[], status: HistoryFilter, keyword: string): PaymentHistoryItem[] {
  return rows.filter((row) => {
    const statusMatched = status === "ALL" || row.status === status;
    const keywordMatched = includesText(row.receptionNumber, keyword) || includesText(row.customerName, keyword);
    return statusMatched && keywordMatched;
  });
}

function readHistorySort(value: string): HistorySortKey | null {
  if (value === "number" || value === "customer" || value === "amount" || value === "status" || value === "date") {
    return value;
  }
  return null;
}

function readHistoryFilter(value: string): HistoryFilter {
  if (value === "PAID" || value === "UNPAID" || value === "REFUNDED") {
    return value;
  }
  return "ALL";
}

function historyStatusLabel(status: PaymentHistoryStatus): string {
  if (status === "PAID") {
    return "입금";
  }
  if (status === "UNPAID") {
    return "미입금";
  }
  return "환불";
}

function historyStatusClass(status: PaymentHistoryStatus): string {
  if (status === "UNPAID") {
    return "text-orange-500";
  }
  if (status === "PAID") {
    return "text-blue-600";
  }
  return "text-neutral-500";
}

function usePaymentSummary() {
  const { startDate, endDate, invalid } = useStatisticsPeriod();
  const resource = useStatisticsResource(fetchPaymentStatistics, startDate, endDate, invalid);
  return { ...resource, invalid };
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-blue-600">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{hint}</p>
    </div>
  );
}

function count(value: number | undefined): string {
  return value === undefined ? "-" : `${value.toLocaleString("ko-KR")}건`;
}

function money(value: number | undefined): string {
  return value === undefined ? "-" : won(value);
}
