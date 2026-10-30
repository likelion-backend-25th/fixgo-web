export function readNotice(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "notice" in value &&
    typeof value.notice === "string"
  ) {
    return value.notice;
  }
  return null;
}

export function compareText(left: string | number, right: string | number): number {
  return String(left).localeCompare(String(right), "ko");
}
