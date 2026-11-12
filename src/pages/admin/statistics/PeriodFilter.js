import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { SelectBox, TextField } from "@/components/ui/Field";
import { STATISTICS_PRESETS, STATISTICS_PRESET_LABEL, periodForPreset, statisticsSearch, } from "@/lib/statisticsPeriod";
import { useStatisticsPeriod } from "@/pages/admin/statistics/useStatisticsPeriod";
const presetOptions = STATISTICS_PRESETS.map((preset) => ({
    value: preset,
    label: STATISTICS_PRESET_LABEL[preset],
}));
export function PeriodFilter() {
    const { startDate, endDate, preset, apply } = useStatisticsPeriod();
    const [selected, setSelected] = useState(preset);
    const [start, setStart] = useState(startDate);
    const [end, setEnd] = useState(endDate);
    const invalid = start > end || start === "" || end === "";
    useEffect(() => {
        setSelected(preset);
        setStart(startDate);
        setEnd(endDate);
    }, [endDate, preset, startDate]);
    function choosePreset(value) {
        if (!isStatisticsPreset(value)) {
            return;
        }
        const period = periodForPreset(value);
        setSelected(value);
        setStart(period.startDate);
        setEnd(period.endDate);
        apply(period.startDate, period.endDate);
    }
    return (_jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [_jsx(SelectBox, { value: selected === "custom" ? "" : selected, onChange: choosePreset, options: selected === "custom" ? [{ value: "", label: "선택" }, ...presetOptions] : presetOptions }), _jsx("span", { className: "ml-1 text-sm text-neutral-500", children: "\uC9C1\uC811 \uC785\uB825" }), _jsx(TextField, { type: "date", value: start, onChange: (value) => { setSelected("custom"); setStart(value); }, className: "w-40" }), _jsx("span", { className: "text-sm text-neutral-500", children: "~" }), _jsx(TextField, { type: "date", value: end, onChange: (value) => { setSelected("custom"); setEnd(value); }, className: "w-40" }), _jsx(Button, { disabled: invalid, onClick: () => apply(start, end), children: "\uC870\uD68C" }), start > end && _jsx("span", { className: "text-sm text-red-600", children: "\uC2DC\uC791\uC77C\uC740 \uC885\uB8CC\uC77C\uBCF4\uB2E4 \uB2A6\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4." })] }));
}
function isStatisticsPreset(value) {
    return STATISTICS_PRESETS.some((preset) => preset === value);
}
export function StatisticsBackLink() {
    const { startDate, endDate } = useStatisticsPeriod();
    return (_jsx("p", { className: "mb-4", children: _jsx(Link, { to: `/admin/statistics?${statisticsSearch(startDate, endDate)}`, className: "text-sm text-blue-600", children: "\uD1B5\uACC4/\uB9AC\uD3EC\uD2B8\uB85C \uB3CC\uC544\uAC00\uAE30" }) }));
}
