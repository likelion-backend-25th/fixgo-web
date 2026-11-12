import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { isAbortError } from "@/lib/apiClient";
import { fetchModelSymptomStatistics } from "@/lib/statisticsApi";
import { formatRate } from "@/lib/statisticsPeriod";
import { PeriodFilter, StatisticsBackLink } from "@/pages/admin/statistics/PeriodFilter";
import { useStatisticsPage } from "@/pages/admin/statistics/useStatisticsPage";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
export function SymptomStatsPage() {
    const { modelId = "" } = useParams();
    const [params] = useSearchParams();
    const modelName = params.get("modelName") ?? modelId;
    const { startDate, endDate, invalid } = useStatisticsPeriod();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const numericId = Number(modelId);
    const idValid = Number.isInteger(numericId) && numericId > 0;
    useEffect(() => {
        if (invalid || !idValid) {
            setRows([]);
            setLoading(false);
            setError("");
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        setError("");
        fetchModelSymptomStatistics(numericId, startDate, endDate, controller.signal)
            .then((items) => {
            if (!controller.signal.aborted) {
                setRows(items);
            }
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause)) {
                return;
            }
            setRows([]);
            setError(cause instanceof Error ? cause.message : "고장 증상 통계를 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [endDate, idValid, invalid, numericId, startDate]);
    const list = useStatisticsPage(rows, `${modelId}|${startDate}|${endDate}`);
    return (_jsxs("div", { children: [_jsx(StatisticsBackLink, {}), _jsx(PeriodFilter, {}), _jsxs("p", { className: "mb-4 text-sm text-neutral-600", children: [modelName, " \uACE0\uC7A5 \uC99D\uC0C1 \uBD84\uD3EC"] }), !idValid && _jsx(Notice, { tone: "error", children: "\uBAA8\uB378 \uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." }), error !== "" && _jsx(Notice, { tone: "error", children: error }), loading && _jsx("p", { className: "text-sm text-neutral-500", children: "\uACE0\uC7A5 \uC99D\uC0C1 \uD1B5\uACC4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." }), !loading && rows.length === 0 && error === "" && idValid && invalid && (_jsx("p", { className: "text-sm text-neutral-500", children: "\uC870\uD68C \uAE30\uAC04\uC744 \uD655\uC778\uD574 \uC8FC\uC138\uC694." })), !loading && rows.length === 0 && error === "" && idValid && !invalid && (_jsx("p", { className: "text-sm text-neutral-500", children: "\uC870\uD68C \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." })), _jsx("ul", { className: "space-y-3", children: list.visible.map((row) => (_jsxs("li", { children: [_jsxs("div", { className: "mb-1 flex justify-between text-sm", children: [_jsx("span", { children: row.symptomName }), _jsxs("span", { children: [row.count.toLocaleString("ko-KR"), "\uAC74 \u00B7 ", formatRate(row.percentage)] })] }), _jsx("div", { className: "h-3 rounded bg-neutral-100", children: _jsx("div", { className: "h-3 rounded bg-blue-400", style: { width: `${Math.min(row.percentage, 100)}%` } }) })] }, row.symptomName))) }), _jsx(Pagination, { page: list.page, pageCount: list.pageCount, onPageChange: list.setPage })] }));
}
