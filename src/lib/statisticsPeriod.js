const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
export function isIsoDate(value) {
    if (!ISO_DATE.test(value)) {
        return false;
    }
    const [yearText, monthText, dayText] = value.split("-");
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}
export const STATISTICS_ALL_START = "2025-01-01";
export const STATISTICS_PRESETS = ["all", "today", "week", "month", "quarter", "half", "year"];
export const STATISTICS_PRESET_LABEL = {
    all: "전체",
    today: "오늘",
    week: "1주일",
    month: "1개월",
    quarter: "3개월",
    half: "6개월",
    year: "1년",
};
// 종료일은 오늘이다. 전체는 저장된 접수보다 앞선 고정일이고, 1주일은 오늘을 포함한 7일, 개월 단위는 같은 날짜까지 거슬러 올라간다.
export function periodForPreset(preset, today = new Date()) {
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (preset === "all") {
        return { startDate: STATISTICS_ALL_START, endDate: toIsoDate(end) };
    }
    const start = new Date(end);
    if (preset === "week") {
        start.setDate(start.getDate() - 6);
    }
    else if (preset === "month") {
        moveMonths(start, -1);
    }
    else if (preset === "quarter") {
        moveMonths(start, -3);
    }
    else if (preset === "half") {
        moveMonths(start, -6);
    }
    else if (preset === "year") {
        moveMonths(start, -12);
    }
    return { startDate: toIsoDate(start), endDate: toIsoDate(end) };
}
export function matchStatisticsPreset(startDate, endDate, today = new Date()) {
    for (const preset of STATISTICS_PRESETS) {
        const period = periodForPreset(preset, today);
        if (period.startDate === startDate && period.endDate === endDate) {
            return preset;
        }
    }
    return "custom";
}
function moveMonths(date, months) {
    const day = date.getDate();
    const moved = new Date(date.getFullYear(), date.getMonth() + months, 1);
    const lastDay = new Date(moved.getFullYear(), moved.getMonth() + 1, 0).getDate();
    date.setFullYear(moved.getFullYear(), moved.getMonth(), Math.min(day, lastDay));
}
export function statisticsSearch(startDate, endDate) {
    return new URLSearchParams({ startDate, endDate }).toString();
}
export function formatDurationMinutes(minutes) {
    if (minutes === null || !Number.isFinite(minutes) || minutes < 0) {
        return "-";
    }
    const days = minutes / (60 * 24);
    if (days >= 1) {
        return `${days.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}일`;
    }
    if (minutes >= 60) {
        const hours = minutes / 60;
        return `${hours.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}시간`;
    }
    return `${Math.round(minutes).toLocaleString("ko-KR")}분`;
}
export function formatRate(value) {
    return `${value.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}%`;
}
function toIsoDate(date) {
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
// 통계 API는 기간 합계만 준다. 월별 그래프는 선택 기간과 겹치는 달을 잘라 각각 조회한다.
export function listStatisticsMonths(startDate, endDate) {
    if (!isIsoDate(startDate) || !isIsoDate(endDate) || startDate > endDate) {
        return [];
    }
    const start = parseIsoDate(startDate);
    const end = parseIsoDate(endDate);
    const slices = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor.getTime() <= lastMonth.getTime()) {
        const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        const sliceStart = monthStart < start ? start : monthStart;
        const sliceEnd = monthEnd > end ? end : monthEnd;
        slices.push({
            year: cursor.getFullYear(),
            month: cursor.getMonth() + 1,
            startDate: toIsoDate(sliceStart),
            endDate: toIsoDate(sliceEnd),
        });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    const recent = slices.slice(-24);
    const spansYears = recent.some((slice) => slice.year !== recent[0]?.year);
    return recent.map((slice) => ({
        label: spansYears ? `${String(slice.year).slice(2)}.${String(slice.month).padStart(2, "0")}` : `${slice.month}월`,
        startDate: slice.startDate,
        endDate: slice.endDate,
    }));
}
function parseIsoDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}
