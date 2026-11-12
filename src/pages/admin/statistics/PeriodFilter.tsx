import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { SelectBox, TextField } from "@/components/ui/Field";
import {
  STATISTICS_PRESETS,
  STATISTICS_PRESET_LABEL,
  periodForPreset,
  statisticsSearch,
  type StatisticsPreset,
} from "@/lib/statisticsPeriod";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";

const presetOptions = [
  ...STATISTICS_PRESETS.map((preset) => ({
    value: preset,
    label: STATISTICS_PRESET_LABEL[preset],
  })),
  { value: "custom", label: "직접 입력" },
];

export function PeriodFilter() {
  const { startDate, endDate, preset, apply } = useStatisticsPeriod();
  const [selected, setSelected] = useState<StatisticsPreset | "custom">(preset);
  const [start, setStart] = useState(startDate);
  const [end, setEnd] = useState(endDate);
  const invalid = start > end || start === "" || end === "";

  useEffect(() => {
    setSelected(preset);
    setStart(startDate);
    setEnd(endDate);
  }, [endDate, preset, startDate]);

  function choosePreset(value: string) {
    if (value === "custom") {
      setSelected("custom");
      return;
    }
    if (!isStatisticsPreset(value)) {
      return;
    }
    const period = periodForPreset(value);
    setSelected(value);
    setStart(period.startDate);
    setEnd(period.endDate);
    apply(period.startDate, period.endDate);
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <SelectBox value={selected} onChange={choosePreset} options={presetOptions} />
      {selected === "custom" && (
        <>
          <TextField type="date" value={start} onChange={setStart} className="w-40" />
          <span className="text-sm text-neutral-500">~</span>
          <TextField type="date" value={end} onChange={setEnd} className="w-40" />
          <Button disabled={invalid} onClick={() => apply(start, end)}>조회</Button>
          {start > end && <span className="text-sm text-red-600">시작일은 종료일보다 늦을 수 없습니다.</span>}
        </>
      )}
    </div>
  );
}

function isStatisticsPreset(value: string): value is StatisticsPreset {
  return STATISTICS_PRESETS.some((preset) => preset === value);
}

export function StatisticsBackLink() {
  const { startDate, endDate } = useStatisticsPeriod();
  return (
    <p className="mb-4">
      <Link to={`/admin/statistics?${statisticsSearch(startDate, endDate)}`} className="text-sm text-blue-600">
        통계/리포트로 돌아가기
      </Link>
    </p>
  );
}
