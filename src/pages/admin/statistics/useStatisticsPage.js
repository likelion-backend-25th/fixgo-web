import { useState } from "react";
export const STATISTICS_PAGE_SIZE = 20;
export function useStatisticsPage(rows, resetKey) {
    const [page, setPage] = useState(1);
    const [seenKey, setSeenKey] = useState(resetKey);
    if (seenKey !== resetKey) {
        setSeenKey(resetKey);
        setPage(1);
    }
    const pageCount = Math.max(1, Math.ceil(rows.length / STATISTICS_PAGE_SIZE));
    const safePage = Math.min(page, pageCount);
    const start = (safePage - 1) * STATISTICS_PAGE_SIZE;
    return {
        page: safePage,
        pageCount,
        visible: rows.slice(start, start + STATISTICS_PAGE_SIZE),
        setPage,
    };
}
