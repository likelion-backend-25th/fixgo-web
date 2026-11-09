import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { SortMenu } from "@/components/ui/SortMenu";
import { categoryLabel } from "@/lib/asReceptionApi";
import { includesText } from "@/lib/format";
import { compareText } from "@/lib/guards";
import { fetchModelStatistics } from "@/lib/statisticsApi";
import { statisticsSearch } from "@/lib/statisticsPeriod";
import { PeriodFilter, StatisticsBackLink } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPage } from "@/pages/admin/statistics/useStatisticsPage";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
import { useStatisticsResource } from "@/pages/admin/statistics/useStatisticsResource";
import type { ProductCategory } from "@/types/asReception";
import type { ModelStatistics } from "@/types/statistics";

type ModelSortKey = "model" | "received" | "done" | "doing";

export function ModelStatsPage() {
  const { startDate, endDate, invalid } = useStatisticsPeriod();
  const { data, loading, error } = useStatisticsResource(fetchModelStatistics, startDate, endDate, invalid);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [sortKey, setSortKey] = useState<ModelSortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const query = statisticsSearch(startDate, endDate);
  const rows = useMemo(() => {
    const matched = (data ?? []).filter((row) => includesText(row.modelName, appliedKeyword));
    return sortModels(matched, sortKey, sortDir);
  }, [appliedKeyword, data, sortDir, sortKey]);
  const list = useStatisticsPage(rows, `${appliedKeyword}|${sortKey ?? ""}|${sortDir}|${startDate}|${endDate}`);

  function toggleSort(key: ModelSortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  }

  return (
    <div>
      <StatisticsBackLink />
      <PeriodFilter />
      <form
        className="mb-4 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setAppliedKeyword(keyword);
        }}
      >
        <TextField value={keyword} onChange={setKeyword} placeholder="모델명" className="w-40" />
        <Button type="submit">검색</Button>
      </form>
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <DataTable
        columns={[
          {
            key: "model",
            header: <SortMenu label="모델" active={sortKey === "model"} direction={sortDir} onToggle={() => toggleSort("model")} />,
            render: (row) => row.modelName,
          },
          { key: "group", header: "제품군", render: (row) => productGroupLabel(row.productGroup) },
          {
            key: "received",
            header: <SortMenu label="접수" active={sortKey === "received"} direction={sortDir} onToggle={() => toggleSort("received")} />,
            render: (row) => row.receptionCount.toLocaleString("ko-KR"),
          },
          {
            key: "done",
            header: <SortMenu label="완료" active={sortKey === "done"} direction={sortDir} onToggle={() => toggleSort("done")} />,
            render: (row) => row.completedCount.toLocaleString("ko-KR"),
          },
          {
            key: "doing",
            header: <SortMenu label="진행" active={sortKey === "doing"} direction={sortDir} onToggle={() => toggleSort("doing")} />,
            render: (row) => row.inProgressCount.toLocaleString("ko-KR"),
          },
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
        rows={list.visible}
        rowKey={(row) => String(row.modelId)}
        emptyText={invalid ? "조회 기간을 확인해 주세요." : loading ? "모델 통계를 불러오는 중입니다." : "조회 결과가 없습니다."}
      />
      <Pagination page={list.page} pageCount={list.pageCount} onPageChange={list.setPage} />
    </div>
  );
}

function sortModels(rows: ModelStatistics[], sortKey: ModelSortKey | null, sortDir: "asc" | "desc"): ModelStatistics[] {
  if (sortKey === null) {
    return rows;
  }
  const direction = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => compareModel(left, right, sortKey) * direction);
}

function compareModel(left: ModelStatistics, right: ModelStatistics, sortKey: ModelSortKey): number {
  if (sortKey === "model") {
    return compareText(left.modelName, right.modelName);
  }
  if (sortKey === "received") {
    return left.receptionCount - right.receptionCount;
  }
  if (sortKey === "done") {
    return left.completedCount - right.completedCount;
  }
  return left.inProgressCount - right.inProgressCount;
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
