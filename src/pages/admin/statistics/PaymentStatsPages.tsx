import { Notice } from "@/components/ui/Panel";
import { fetchPaymentStatistics } from "@/lib/statisticsApi";
import { won } from "@/lib/format";
import { PeriodFilter, StatisticsBackLink } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
import { useStatisticsResource } from "@/pages/admin/statistics/useStatisticsResource";

export function DepositWaitingPage() {
  const payment = usePaymentSummary();
  return (
    <div>
      <StatisticsBackLink />
      <PeriodFilter />
      {payment.error !== "" && <Notice tone="error">{payment.error}</Notice>}
      <div className="grid gap-3 md:grid-cols-4">
        <SummaryCard label="현재 미입금" value={payment.loading ? "조회 중" : count(payment.data?.unpaidCount)} hint="청구서 기준" />
        <SummaryCard label="수납" value={payment.loading ? "조회 중" : money(payment.data?.totalPaidAmount)} hint="승인 완료" />
        <SummaryCard label="환불" value={payment.loading ? "조회 중" : money(payment.data?.totalRefundAmount)} hint="환불 완료" />
        <SummaryCard label="순수납" value={payment.loading ? "조회 중" : money(payment.data?.netCollectedAmount)} hint="수납에서 환불을 뺀 금액" />
      </div>
      <p className="mt-3 text-sm text-neutral-500">미입금 건수는 현재 미입금 청구서 수입니다.</p>
    </div>
  );
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
    </div>
  );
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
