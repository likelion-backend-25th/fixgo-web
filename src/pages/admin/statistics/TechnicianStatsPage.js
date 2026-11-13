import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { useListParams } from "@/hooks/useListParams";
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
export function TechnicianStatsPage() {
    const { startDate, endDate, invalid } = useStatisticsPeriod();
    const { data, loading, error } = useStatisticsResource(fetchTechnicianStatistics, startDate, endDate, invalid);
    const filters = useListParams();
    const appliedKeyword = filters.text("q");
    const [keyword, setKeyword] = useState(appliedKeyword);
    const sortRaw = filters.text("sort");
    const sortKey = sortRaw === "name" || sortRaw === "assigned" || sortRaw === "done" || sortRaw === "doing" || sortRaw === "avg" || sortRaw === "sales" ? sortRaw : null;
    const sortDir = filters.text("dir") === "desc" ? "desc" : "asc";
    const rows = useMemo(() => {
        const matched = (data ?? []).filter((row) => includesText(row.technicianName, appliedKeyword));
        return sortTechnicians(matched, sortKey, sortDir);
    }, [appliedKeyword, data, sortDir, sortKey]);
    const list = useStatisticsPage(rows, `${appliedKeyword}|${sortKey ?? ""}|${sortDir}|${startDate}|${endDate}`);
    function toggleSort(key) {
        const nextDir = sortKey === key ? (sortDir === "asc" ? "desc" : "asc") : "asc";
        filters.replace({ sort: key, dir: nextDir, page: null });
    }
    return (_jsxs("div", { children: [_jsx(StatisticsBackLink, {}), _jsx(PeriodFilter, {}), _jsxs("form", { className: "mb-4 flex flex-wrap items-center gap-2", onSubmit: (event) => {
                    event.preventDefault();
                    filters.replace({ q: keyword.trim(), page: null });
                }, children: [_jsx(TextField, { value: keyword, onChange: setKeyword, placeholder: "\uAE30\uC0AC\uBA85", className: "w-40" }), _jsx(Button, { type: "submit", children: "\uAC80\uC0C9" })] }), error !== "" && _jsx(Notice, { tone: "error", children: error }), _jsx(DataTable, { columns: [
                    {
                        key: "name",
                        header: _jsx(SortMenu, { label: "\uAE30\uC0AC\uBA85", active: sortKey === "name", direction: sortDir, onToggle: () => toggleSort("name") }),
                        render: (row) => row.technicianName,
                    },
                    {
                        key: "assigned",
                        header: _jsx(SortMenu, { label: "\uBC30\uC815", active: sortKey === "assigned", direction: sortDir, onToggle: () => toggleSort("assigned") }),
                        render: (row) => row.assignedCount.toLocaleString("ko-KR"),
                    },
                    {
                        key: "done",
                        header: _jsx(SortMenu, { label: "\uC644\uB8CC", active: sortKey === "done", direction: sortDir, onToggle: () => toggleSort("done") }),
                        render: (row) => row.completedCount.toLocaleString("ko-KR"),
                    },
                    {
                        key: "doing",
                        header: _jsx(SortMenu, { label: "\uC9C4\uD589", active: sortKey === "doing", direction: sortDir, onToggle: () => toggleSort("doing") }),
                        render: (row) => row.inProgressCount.toLocaleString("ko-KR"),
                    },
                    {
                        key: "avg",
                        header: _jsx(SortMenu, { label: "\uD3C9\uADE0 \uC18C\uC694", active: sortKey === "avg", direction: sortDir, onToggle: () => toggleSort("avg") }),
                        render: (row) => formatDurationMinutes(row.averageDurationMinutes),
                    },
                    {
                        key: "sales",
                        header: _jsx(SortMenu, { label: "\uB9E4\uCD9C", active: sortKey === "sales", direction: sortDir, onToggle: () => toggleSort("sales") }),
                        render: (row) => won(row.revenue),
                    },
                ], rows: list.visible, rowKey: (row) => String(row.technicianId), emptyText: invalid ? "조회 기간을 확인해 주세요." : loading ? "기사 통계를 불러오는 중입니다." : "조회 결과가 없습니다." }), _jsx(Pagination, { page: list.page, pageCount: list.pageCount, onPageChange: list.setPage })] }));
}
function sortTechnicians(rows, sortKey, sortDir) {
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
function compareDuration(left, right, direction) {
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
function compareTechnician(left, right, sortKey) {
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
