// 구매일로부터 보증 개월 수가 지나기 전까지 무상이다. 만료일 당일부터 유상이다.
export function assessWarranty(purchasedAt, warrantyMonths, today = seoulToday()) {
    if (purchasedAt === null || purchasedAt.trim() === "" || warrantyMonths === null || warrantyMonths < 0) {
        return null;
    }
    const purchased = parseDate(purchasedAt);
    if (purchased === null) {
        return null;
    }
    const expiresOn = addMonths(purchased, warrantyMonths);
    return {
        purchasedAt,
        warrantyMonths,
        expiresOn: formatIso(expiresOn),
        covered: compareDate(today, expiresOn) < 0,
    };
}
function seoulToday() {
    const formatted = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
    return parseDate(formatted) ?? { year: 1970, month: 1, day: 1 };
}
function parseDate(value) {
    const matched = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (matched === null) {
        return null;
    }
    const year = Number(matched[1]);
    const month = Number(matched[2]);
    const day = Number(matched[3]);
    if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
        return null;
    }
    return { year, month, day };
}
function addMonths(date, months) {
    const monthIndex = date.month - 1 + months;
    const year = date.year + Math.floor(monthIndex / 12);
    const month = (monthIndex % 12) + 1;
    const day = Math.min(date.day, daysInMonth(year, month));
    return { year, month, day };
}
function daysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
function compareDate(left, right) {
    if (left.year !== right.year)
        return left.year - right.year;
    if (left.month !== right.month)
        return left.month - right.month;
    return left.day - right.day;
}
function formatIso(date) {
    const month = String(date.month).padStart(2, "0");
    const day = String(date.day).padStart(2, "0");
    return `${date.year}-${month}-${day}`;
}
