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
import type { ModelSymptomStatistics } from "@/types/statistics";

export function SymptomStatsPage() {
  const { modelId = "" } = useParams();
  const [params] = useSearchParams();
  const modelName = params.get("modelName") ?? modelId;
  const { startDate, endDate, invalid } = useStatisticsPeriod();
  const [rows, setRows] = useState<ModelSymptomStatistics[]>([]);
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
      .catch((cause: unknown) => {
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

  return (
    <div>
      <StatisticsBackLink />
      <PeriodFilter />
      <p className="mb-4 text-sm text-neutral-600">{modelName} 고장 증상 분포</p>
      {!idValid && <Notice tone="error">모델 번호가 올바르지 않습니다.</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      {loading && <p className="text-sm text-neutral-500">고장 증상 통계를 불러오는 중입니다.</p>}
      {!loading && rows.length === 0 && error === "" && idValid && invalid && (
        <p className="text-sm text-neutral-500">조회 기간을 확인해 주세요.</p>
      )}
      {!loading && rows.length === 0 && error === "" && idValid && !invalid && (
        <p className="text-sm text-neutral-500">조회 결과가 없습니다.</p>
      )}
      <ul className="space-y-3">
        {list.visible.map((row) => (
          <li key={row.symptomName}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{row.symptomName}</span>
              <span>{row.count.toLocaleString("ko-KR")}건 · {formatRate(row.percentage)}</span>
            </div>
            <div className="h-3 rounded bg-neutral-100">
              <div className="h-3 rounded bg-blue-400" style={{ width: `${Math.min(row.percentage, 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <Pagination page={list.page} pageCount={list.pageCount} onPageChange={list.setPage} />
    </div>
  );
}
