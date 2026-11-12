import { Link } from "react-router";
import { Notice } from "@/components/ui/Panel";
import { fetchLongPendingReceptions } from "@/lib/longPendingApi";
import {
  fetchModelStatistics,
  fetchMonthlyStatistics,
  fetchPaymentStatistics,
  fetchReceptionStatistics,
  fetchShipmentHistory,
  fetchTechnicianStatistics,
} from "@/lib/statisticsApi";
import { formatDurationMinutes, formatRate, statisticsSearch } from "@/lib/statisticsPeriod";
import { won } from "@/lib/format";
import { summarizeShipmentMethods } from "@/pages/admin/statistics/ShipmentStatsPage";
import { MonthlyTrendChart } from "@/pages/admin/statistics/MonthlyTrendChart";
import { PeriodFilter } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
import { useStatisticsResource } from "@/pages/admin/statistics/useStatisticsResource";
import type { ModelStatistics, TechnicianStatistics } from "@/types/statistics";

export function StatisticsPage() {
  const { startDate, endDate, invalid } = useStatisticsPeriod();
  const reception = useStatisticsResource(fetchReceptionStatistics, startDate, endDate, invalid);
  const payment = useStatisticsResource(fetchPaymentStatistics, startDate, endDate, invalid);
  const technicians = useStatisticsResource(fetchTechnicianStatistics, startDate, endDate, invalid);
  const models = useStatisticsResource(fetchModelStatistics, startDate, endDate, invalid);
  const shipments = useStatisticsResource(fetchShipmentHistory, startDate, endDate, invalid);
  const pending = useStatisticsResource(loadLongPending, startDate, endDate, invalid);
  const monthly = useStatisticsResource(fetchMonthlyStatistics, startDate, endDate, invalid);
  const shipmentSummary = shipments.data === null ? null : summarizeShipmentMethods(shipments.data);
  const query = statisticsSearch(startDate, endDate);
  const monthLabels = monthly.data?.map((point) => point.label) ?? [];
  const errors = [reception.error, payment.error, technicians.error, models.error, shipments.error, pending.error, monthly.error]
    .filter((message, index, all) => message !== "" && all.indexOf(message) === index);

  return (
    <div className="space-y-4">
      <PeriodFilter />
      {errors.map((message) => <Notice key={message} tone="error">{message}</Notice>)}
      <div className="grid gap-3 md:grid-cols-5">
        <Kpi
          label="접수"
          value={countText(reception.loading, reception.data?.receivedCount, "건")}
          hint={`${startDate} ~ ${endDate}`}
        />
        <Kpi
          label="처리 완료"
          value={countText(reception.loading, reception.data?.completedCount, "건")}
          hint={reception.data === null ? "완료율" : `완료율 ${formatRate(reception.data.completionRate)}`}
        />
        <Link to="/admin/statistics/incomplete" className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-400">
          <p className="text-sm text-neutral-500">장기 미처리</p>
          <p className="mt-2 text-2xl font-semibold text-blue-600">{countText(pending.loading, pending.data?.total, "건")}</p>
          <p className="mt-1 text-xs text-neutral-500">
            21일 이상 {countText(pending.loading, pending.data?.over21, "건")}
          </p>
        </Link>
        <Kpi
          label="평균 수리 기간"
          value={technicians.loading ? "조회 중" : formatDurationMinutes(weightedAverageMinutes(technicians.data ?? []))}
          hint="완료 건 가중 평균"
        />
        <Link to={`/admin/statistics/deposits/waiting?${query}`} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-400">
          <p className="text-sm text-neutral-500">미입금</p>
          <p className="mt-2 text-2xl font-semibold text-blue-600">{countText(payment.loading, payment.data?.unpaidCount, "건")}</p>
          <p className="mt-1 text-xs text-neutral-500">현재 미입금 청구서</p>
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <MonthlyTrendChart
          title="월별 수리 건수 추이"
          labels={monthLabels}
          loading={monthly.loading}
          formatValue={formatCount}
          series={[
            { name: "접수", tone: "blue", values: monthly.data?.map((point) => point.receivedCount) ?? [] },
            { name: "완료", tone: "green", values: monthly.data?.map((point) => point.completedCount) ?? [] },
          ]}
        />
        <MonthlyTrendChart
          title="월별 수익"
          labels={monthLabels}
          loading={monthly.loading}
          formatValue={formatCount}
          series={[
            { name: "수익", tone: "blue", values: monthly.data?.map((point) => point.revenue) ?? [] },
          ]}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Link to={`/admin/statistics/shipments?${query}`} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-400">
          <p className="mb-3 text-sm font-medium">배송 현황</p>
          <ShipmentOverview loading={shipments.loading} summary={shipmentSummary} />
        </Link>
        <Link to={`/admin/statistics/repair_cost?${query}`} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-400">
          <p className="mb-3 text-sm font-medium">수리비 수납</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Metric label="수납" value={moneyText(payment.loading, payment.data?.totalPaidAmount)} />
            <Metric label="환불" value={moneyText(payment.loading, payment.data?.totalRefundAmount)} />
            <Metric label="순수납" value={moneyText(payment.loading, payment.data?.netCollectedAmount)} />
          </div>
        </Link>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Link to={`/admin/statistics/technicians?${query}`} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-400">
          <p className="mb-3 text-sm font-medium">기사별 처리 현황</p>
          <TechnicianBars loading={technicians.loading} rows={technicians.data ?? []} />
        </Link>
        <Link to={`/admin/statistics/models?${query}`} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm hover:border-blue-400">
          <p className="mb-3 text-sm font-medium">제품 모델별 고장 건수</p>
          <ModelPreview loading={models.loading} rows={models.data ?? []} />
        </Link>
      </div>
      <Kpi
        label="총 입금액"
        value={moneyText(payment.loading, payment.data?.totalPaidAmount)}
        hint="기간 내 승인 완료 금액"
      />
    </div>
  );
}

// 장기 미처리는 기간 파라미터가 없어서, 화면 기간이 바뀌어도 같은 목록의 건수만 다시 센다.
function loadLongPending(_startDate: string, _endDate: string, signal: AbortSignal) {
  return fetchLongPendingReceptions(signal).then((items) => ({
    total: items.length,
    over21: items.filter((item) => item.elapsedDays >= 21).length,
  }));
}

function weightedAverageMinutes(rows: TechnicianStatistics[]): number | null {
  const totals = rows.reduce(
    (sum, row) => {
      if (row.averageDurationMinutes === null || row.completedCount === 0) {
        return sum;
      }
      return {
        minutes: sum.minutes + row.averageDurationMinutes * row.completedCount,
        count: sum.count + row.completedCount,
      };
    },
    { minutes: 0, count: 0 },
  );
  return totals.count === 0 ? null : totals.minutes / totals.count;
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString("ko-KR");
}

function countText(loading: boolean, value: number | undefined, unit: string): string {
  if (loading) {
    return "조회 중";
  }
  return value === undefined ? "-" : `${value.toLocaleString("ko-KR")}${unit}`;
}

function moneyText(loading: boolean, value: number | undefined): string {
  if (loading) {
    return "조회 중";
  }
  return value === undefined ? "-" : won(value);
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-blue-600">{value}</p>
      <p className="mt-1 text-xs text-neutral-500">{hint}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-neutral-500">{label}</p>
      <p className="mt-1 font-semibold text-blue-600">{value}</p>
    </div>
  );
}

function ShipmentOverview({
  loading,
  summary,
}: {
  loading: boolean;
  summary: ReturnType<typeof summarizeShipmentMethods> | null;
}) {
  const rows = [
    {
      label: "택배",
      ready: countText(loading, summary?.delivery.ready, "건"),
      shipping: countText(loading, summary?.delivery.shipping, "건"),
      completed: countText(loading, summary?.delivery.completed, "건"),
    },
    {
      label: "방문 수령",
      ready: countText(loading, summary?.pickup.ready, "건"),
      shipping: "-",
      completed: countText(loading, summary?.pickup.completed, "건"),
    },
  ];

  return (
    <table className="w-full table-fixed text-sm">
      <colgroup>
        <col className="w-24" />
        <col />
        <col />
        <col />
      </colgroup>
      <thead>
        <tr className="text-neutral-500">
          <th className="pb-2 text-left font-normal" />
          <th className="pb-2 text-right font-normal">대기</th>
          <th className="pb-2 text-right font-normal">배송중</th>
          <th className="pb-2 text-right font-normal">완료</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-t border-neutral-100">
            <td className="whitespace-nowrap py-2 pr-3 text-neutral-600">{row.label}</td>
            <td className="py-2 text-right font-semibold text-blue-600 tabular-nums">{row.ready}</td>
            <td className={`py-2 text-right tabular-nums ${row.shipping === "-" ? "text-neutral-300" : "font-semibold text-blue-600"}`}>
              {row.shipping}
            </td>
            <td className="py-2 text-right font-semibold text-blue-600 tabular-nums">{row.completed}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TechnicianBars({ loading, rows }: { loading: boolean; rows: TechnicianStatistics[] }) {
  const top = [...rows].sort((left, right) => right.assignedCount - left.assignedCount).slice(0, 5);
  const max = Math.max(...top.map((row) => row.assignedCount), 1);
  if (loading) {
    return <p className="text-sm text-neutral-500">기사 통계를 불러오는 중입니다.</p>;
  }
  if (top.length === 0) {
    return <p className="text-sm text-neutral-500">조회 결과가 없습니다.</p>;
  }
  return (
    <ul className="space-y-3">
      {top.map((row) => (
        <li key={row.technicianId}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{row.technicianName}</span>
            <span>{row.assignedCount.toLocaleString("ko-KR")}건</span>
          </div>
          <div className="h-2 rounded bg-neutral-100">
            <div className="h-2 rounded bg-blue-600" style={{ width: `${(row.assignedCount / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function ModelPreview({ loading, rows }: { loading: boolean; rows: ModelStatistics[] }) {
  const top = [...rows].sort((left, right) => right.receptionCount - left.receptionCount).slice(0, 5);
  if (loading) {
    return <p className="text-sm text-neutral-500">모델 통계를 불러오는 중입니다.</p>;
  }
  if (top.length === 0) {
    return <p className="text-sm text-neutral-500">조회 결과가 없습니다.</p>;
  }
  return (
    <table className="w-full text-left text-sm">
      <thead className="bg-neutral-100">
        <tr>
          {["모델", "접수", "완료", "주요 증상"].map((header) => (
            <th key={header} className="px-2 py-1 font-medium">{header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {top.map((row) => (
          <tr key={row.modelId} className="border-t border-neutral-200">
            <td className="px-2 py-2">{row.modelName}</td>
            <td>{row.receptionCount.toLocaleString("ko-KR")}</td>
            <td>{row.completedCount.toLocaleString("ko-KR")}</td>
            <td>{row.mainSymptom ?? "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
