export function won(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDate(value: string | null): string {
  if (value === null || value === "") {
    return "-";
  }
  return value.slice(0, 10);
}

export function includesText(source: string, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") {
    return true;
  }
  return source.toLocaleLowerCase().includes(needle);
}
