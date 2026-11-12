// 조회 기간을 달 단위로 자른다. 첫 달과 마지막 달은 선택한 날짜에 맞춰 잘라 쓴다.
export function monthSlices(startDate, endDate) {
    const start = parseIsoDate(startDate);
    const end = parseIsoDate(endDate);
    if (start === null || end === null || start > end) {
        return [];
    }
    const slices = [];
    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    const spansYears = start.getFullYear() !== end.getFullYear();
    while (cursor <= lastMonth) {
        const monthStart = new Date(cursor);
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
        const sliceStart = monthStart < start ? start : monthStart;
        const sliceEnd = monthEnd > end ? end : monthEnd;
        slices.push({
            label: monthLabel(monthStart, spansYears),
            startDate: formatIsoDate(sliceStart),
            endDate: formatIsoDate(sliceEnd),
        });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
    return slices;
}
function monthLabel(monthStart, spansYears) {
    const month = monthStart.getMonth() + 1;
    if (!spansYears) {
        return `${month}월`;
    }
    return `${String(monthStart.getFullYear()).slice(2)}.${month}월`;
}
function parseIsoDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (match === null) {
        return null;
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        return null;
    }
    return date;
}
function formatIsoDate(date) {
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
