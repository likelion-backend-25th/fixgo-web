import { Link } from "react-router";
import { DataTable } from "@/components/ui/DataTable";
import { Notice } from "@/components/ui/Panel";
import { categoryLabel } from "@/lib/asReceptionApi";
import { fetchModelStatistics } from "@/lib/statisticsApi";
import { statisticsSearch } from "@/lib/statisticsPeriod";
import { PeriodFilter, StatisticsBackLink } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
import { useStatisticsResource } from "@/pages/admin/statistics/useStatisticsResource";
import type { ProductCategory } from "@/types/asReception";

export function ModelStatsPage() {
  const { startDate, endDate, invalid } = useStatisticsPeriod();
  const { data, loading, error } = useStatisticsResource(fetchModelStatistics, startDate, endDate, invalid);
  const query = statisticsSearch(startDate, endDate);
  return (
    <div>
      <StatisticsBackLink />
      <PeriodFilter />
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <DataTable
        columns={[
          { key: "model", header: "모델명", render: (row) => row.modelName },
          { key: "group", header: "제품군", render: (row) => productGroupLabel(row.productGroup) },
          { key: "received", header: "접수", render: (row) => row.receptionCount.toLocaleString("ko-KR") },
          { key: "done", header: "완료", render: (row) => row.completedCount.toLocaleString("ko-KR") },
          { key: "doing", header: "진행", render: (row) => row.inProgressCount.toLocaleString("ko-KR") },
          {
            key: "symptom",
            header: "주요증상",
            render: (row) => (
              <Link
                className="text-blue-600"
                to={`/admin/statistics/models/${row.modelId}?${query}&modelName=${encodeURIComponent(row.modelName)}`}
              >
                {row.mainSymptom ?? "증상 분포"}
              </Link>
            ),
          },
        ]}
        rows={data ?? []}
        rowKey={(row) => String(row.modelId)}
        emptyText={invalid ? "조회 기간을 확인해 주세요." : loading ? "모델 통계를 불러오는 중입니다." : "조회 결과가 없습니다."}
      />
    </div>
  );
}

function productGroupLabel(value: string): string {
  if (isProductCategory(value)) {
    return categoryLabel(value);
  }
  return value === "" ? "-" : value;
}

function isProductCategory(value: string): value is ProductCategory {
  return value === "LAPTOP" || value === "PHONE";
}
