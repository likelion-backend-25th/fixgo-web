export function won(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

export function includesText(source: string, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "") {
    return true;
  }
  return source.toLocaleLowerCase().includes(needle);
}
