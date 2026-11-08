import { DataTable } from "@/components/ui/DataTable";
import { Notice } from "@/components/ui/Panel";
import { fetchTechnicianStatistics } from "@/lib/statisticsApi";
import { formatDurationMinutes } from "@/lib/statisticsPeriod";
import { won } from "@/lib/format";
import { PeriodFilter, StatisticsBackLink } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
import { useStatisticsResource } from "@/pages/admin/statistics/useStatisticsResource";

export function TechnicianStatsPage() {
  const { startDate, endDate, invalid } = useStatisticsPeriod();
  const { data, loading, error } = useStatisticsResource(fetchTechnicianStatistics, startDate, endDate, invalid);
  return (
    <div>
      <StatisticsBackLink />
      <PeriodFilter />
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <DataTable
        columns={[
          { key: "name", header: "기사명", render: (row) => row.technicianName },
          { key: "assigned", header: "배정", render: (row) => row.assignedCount.toLocaleString("ko-KR") },
          { key: "done", header: "완료", render: (row) => row.completedCount.toLocaleString("ko-KR") },
          { key: "doing", header: "진행", render: (row) => row.inProgressCount.toLocaleString("ko-KR") },
          { key: "avg", header: "평균 소요", render: (row) => formatDurationMinutes(row.averageDurationMinutes) },
          { key: "sales", header: "매출", render: (row) => won(row.revenue) },
        ]}
        rows={data ?? []}
        rowKey={(row) => String(row.technicianId)}
        emptyText={invalid ? "조회 기간을 확인해 주세요." : loading ? "기사 통계를 불러오는 중입니다." : "조회 결과가 없습니다."}
      />
    </div>
  );
}
