import { Notice } from "@/components/ui/Panel";
import { fetchShipmentStatistics } from "@/lib/statisticsApi";
import { PeriodFilter, StatisticsBackLink } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
import { useStatisticsResource } from "@/pages/admin/statistics/useStatisticsResource";

export function ShipmentStatsPage() {
  const { startDate, endDate, invalid } = useStatisticsPeriod();
  const { data, loading, error } = useStatisticsResource(fetchShipmentStatistics, startDate, endDate, invalid);
  return (
    <div>
      <StatisticsBackLink />
      <PeriodFilter />
      <p className="mb-4 text-sm text-neutral-500">선택한 기간에 생성된 배송의 현재 상태입니다.</p>
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <div className="grid gap-3 md:grid-cols-3">
        <Card label="배송 대기" value={loading ? "조회 중" : count(data?.readyCount)} />
        <Card label="배송중" value={loading ? "조회 중" : count(data?.shippingCount)} />
        <Card label="배송 완료" value={loading ? "조회 중" : count(data?.completedCount)} hint="배송 완료와 수령 완료" />
      </div>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-blue-600">{value}</p>
      {hint !== undefined && <p className="mt-1 text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

function count(value: number | undefined): string {
  return value === undefined ? "-" : `${value.toLocaleString("ko-KR")}건`;
}
