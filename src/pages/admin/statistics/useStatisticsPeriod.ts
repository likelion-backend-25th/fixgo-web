import { useSearchParams } from "react-router";
import { isIsoDate, matchStatisticsPreset, periodForPreset } from "@/lib/statisticsPeriod";

export function useStatisticsPeriod() {
  const [params, setParams] = useSearchParams();
  const fallback = periodForPreset("all");
  const startParam = params.get("startDate");
  const endParam = params.get("endDate");
  const startDate = startParam !== null && isIsoDate(startParam) ? startParam : fallback.startDate;
  const endDate = endParam !== null && isIsoDate(endParam) ? endParam : fallback.endDate;
  const invalid = startDate > endDate;
  const preset = invalid ? "custom" : matchStatisticsPreset(startDate, endDate);

  function apply(nextStart: string, nextEnd: string) {
    const next = new URLSearchParams(params);
    next.set("startDate", nextStart);
    next.set("endDate", nextEnd);
    setParams(next);
  }

  return { startDate, endDate, invalid, preset, apply };
}
