export function won(value) {
    return `${value.toLocaleString("ko-KR")}원`;
}
export function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function formatDate(value) {
    if (value === null || value === "") {
        return "-";
    }
    return value.slice(0, 10);
}
export function formatYearMonthDay(value) {
    if (value === null || value.trim() === "") {
        return "-";
    }
    const digits = value.replace(/\D/g, "");
    if (digits.length < 8) {
        return value;
    }
    return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6, 8)}`;
}
export function formatDurationMinutes(value) {
    if (value === null || !Number.isFinite(value) || value < 0) {
        return "-";
    }
    const total = Math.round(value);
    const hours = Math.floor(total / 60);
    const minutes = total % 60;
    if (hours === 0) {
        return `${minutes}분`;
    }
    if (minutes === 0) {
        return `${hours}시간`;
    }
    return `${hours}시간 ${minutes}분`;
}
export function includesText(source, query) {
    const needle = query.trim().toLocaleLowerCase();
    if (needle === "") {
        return true;
    }
    return source.toLocaleLowerCase().includes(needle);
}
