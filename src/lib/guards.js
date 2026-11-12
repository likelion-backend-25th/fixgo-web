export function readNotice(value) {
    if (typeof value === "object" &&
        value !== null &&
        "notice" in value &&
        typeof value.notice === "string") {
        return value.notice;
    }
    return null;
}
export function compareText(left, right) {
    return String(left).localeCompare(String(right), "ko");
}
