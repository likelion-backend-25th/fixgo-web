import { useMemo, useState } from "react";

const PAGE_SIZE = 20;

export function usePageSlice<T>(rows: T[]) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const slice = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, safePage]);

  return { page: safePage, pageCount, slice, setPage };
}
