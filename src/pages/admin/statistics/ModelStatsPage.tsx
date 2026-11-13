import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useListParams } from "@/hooks/useListParams";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
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
type GroupFilter = "ALL" | ProductCategory;

const groupFilters: { value: GroupFilter; label: string }[] = [
  { value: "ALL", label: "제품군 전체" },
  { value: "LAPTOP", label: "노트북" },
  { value: "PHONE", label: "스마트폰" },
];

export function ModelStatsPage() {
  const navigate = useNavigate();
  const { startDate, endDate, invalid } = useStatisticsPeriod();
  const { data, loading, error } = useStatisticsResource(fetchModelStatistics, startDate, endDate, invalid);
  const filters = useListParams();
  const appliedKeyword = filters.text("q");
  const [keyword, setKeyword] = useState(appliedKeyword);
  const group = readGroupFilter(filters.text("group", "ALL"));
  const sortKey = readModelSort(filters.text("sort"));
  const sortDir = filters.text("dir") === "desc" ? "desc" : "asc";
  const query = statisticsSearch(startDate, endDate);
  const rows = useMemo(() => {
    const matched = (data ?? []).filter((row) => includesText(row.modelName, appliedKeyword) && matchesGroup(row, group));
    return sortModels(matched, sortKey, sortDir);
  }, [appliedKeyword, data, group, sortDir, sortKey]);
  const list = useStatisticsPage(rows, `${appliedKeyword}|${group}|${sortKey ?? ""}|${sortDir}|${startDate}|${endDate}`);

  function toggleSort(key: ModelSortKey) {
    const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    filters.replace({ sort: key, dir: nextDir, page: null });
  }

  return (
    <div>
      <StatisticsBackLink />
      <PeriodFilter />
      <form
        className="mb-4 flex flex-wrap items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          filters.replace({ q: keyword.trim(), page: null });
        }}
      >
        <TextField value={keyword} onChange={setKeyword} placeholder="모델명" className="w-40" />
        <Button type="submit">검색</Button>
        <SelectBox value={group} onChange={(value) => filters.replace({ group: readGroupFilter(value) === "ALL" ? null : readGroupFilter(value), page: null })} options={groupFilters} />
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
            render: (row) => row.mainSymptom ?? "증상 분포",
          },
        ]}
        rows={list.visible}
        rowKey={(row) => String(row.modelId)}
        onRowClick={(row) => navigate(`/admin/statistics/models/${row.modelId}?${query}&modelName=${encodeURIComponent(row.modelName)}`)}
        emptyText={invalid ? "조회 기간을 확인해 주세요." : loading ? "모델 통계를 불러오는 중입니다." : "조회 결과가 없습니다."}
      />
      <Pagination page={list.page} pageCount={list.pageCount} onPageChange={list.setPage} />
    </div>
  );
}

function matchesGroup(row: ModelStatistics, group: GroupFilter): boolean {
  return group === "ALL" || row.productGroup === group;
}

function readModelSort(value: string): ModelSortKey | null {
  if (value === "model" || value === "received" || value === "done" || value === "doing") {
    return value;
  }
  return null;
}

function readGroupFilter(value: string): GroupFilter {
  if (value === "LAPTOP" || value === "PHONE") {
    return value;
  }
  return "ALL";
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
