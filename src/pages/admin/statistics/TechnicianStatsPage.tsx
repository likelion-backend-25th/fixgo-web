import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { SortMenu } from "@/components/ui/SortMenu";
import { includesText, won } from "@/lib/format";
import { compareText } from "@/lib/guards";
import { fetchTechnicianStatistics } from "@/lib/statisticsApi";
import { formatDurationMinutes } from "@/lib/statisticsPeriod";
import { PeriodFilter, StatisticsBackLink } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPage } from "@/pages/admin/statistics/useStatisticsPage";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
import { useStatisticsResource } from "@/pages/admin/statistics/useStatisticsResource";
import type { TechnicianStatistics } from "@/types/statistics";

type TechnicianSortKey = "name" | "assigned" | "done" | "doing" | "avg" | "sales";

export function TechnicianStatsPage() {
  const { startDate, endDate, invalid } = useStatisticsPeriod();
  const { data, loading, error } = useStatisticsResource(fetchTechnicianStatistics, startDate, endDate, invalid);
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [sortKey, setSortKey] = useState<TechnicianSortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const rows = useMemo(() => {
    const matched = (data ?? []).filter((row) => includesText(row.technicianName, appliedKeyword));
    return sortTechnicians(matched, sortKey, sortDir);
  }, [appliedKeyword, data, sortDir, sortKey]);
  const list = useStatisticsPage(rows, `${appliedKeyword}|${sortKey ?? ""}|${sortDir}|${startDate}|${endDate}`);

  function toggleSort(key: TechnicianSortKey) {
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
        <TextField value={keyword} onChange={setKeyword} placeholder="기사명" className="w-40" />
        <Button type="submit">검색</Button>
      </form>
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <DataTable
        columns={[
          {
            key: "name",
            header: <SortMenu label="기사명" active={sortKey === "name"} direction={sortDir} onToggle={() => toggleSort("name")} />,
            render: (row) => row.technicianName,
          },
          {
            key: "assigned",
            header: <SortMenu label="배정" active={sortKey === "assigned"} direction={sortDir} onToggle={() => toggleSort("assigned")} />,
            render: (row) => row.assignedCount.toLocaleString("ko-KR"),
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
            key: "avg",
            header: <SortMenu label="평균 소요" active={sortKey === "avg"} direction={sortDir} onToggle={() => toggleSort("avg")} />,
            render: (row) => formatDurationMinutes(row.averageDurationMinutes),
          },
          {
            key: "sales",
            header: <SortMenu label="매출" active={sortKey === "sales"} direction={sortDir} onToggle={() => toggleSort("sales")} />,
            render: (row) => won(row.revenue),
          },
        ]}
        rows={list.visible}
        rowKey={(row) => String(row.technicianId)}
        emptyText={invalid ? "조회 기간을 확인해 주세요." : loading ? "기사 통계를 불러오는 중입니다." : "조회 결과가 없습니다."}
      />
      <Pagination page={list.page} pageCount={list.pageCount} onPageChange={list.setPage} />
    </div>
  );
}

function sortTechnicians(
  rows: TechnicianStatistics[],
  sortKey: TechnicianSortKey | null,
  sortDir: "asc" | "desc",
): TechnicianStatistics[] {
  if (sortKey === null) {
    return rows;
  }
  const direction = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((left, right) => {
    if (sortKey === "avg") {
      return compareDuration(left.averageDurationMinutes, right.averageDurationMinutes, direction);
    }
    return compareTechnician(left, right, sortKey) * direction;
  });
}

function compareDuration(left: number | null, right: number | null, direction: number): number {
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

function compareTechnician(left: TechnicianStatistics, right: TechnicianStatistics, sortKey: TechnicianSortKey): number {
  if (sortKey === "name") {
    return compareText(left.technicianName, right.technicianName);
  }
  if (sortKey === "assigned") {
    return left.assignedCount - right.assignedCount;
  }
  if (sortKey === "done") {
    return left.completedCount - right.completedCount;
  }
  if (sortKey === "doing") {
    return left.inProgressCount - right.inProgressCount;
  }
  return left.revenue - right.revenue;
}
