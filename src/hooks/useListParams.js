import { useSearchParams } from "react-router";
export function useListParams() {
    const [params, setParams] = useSearchParams();
    function text(key, fallback = "") {
        return params.get(key) ?? fallback;
    }
    function page() {
        const raw = Number(params.get("page"));
        return Number.isInteger(raw) && raw > 0 ? raw : 1;
    }
    function replace(updates) {
        setParams((current) => {
            const next = new URLSearchParams(current);
            for (const [key, item] of Object.entries(updates)) {
                if (item === null || item === "") {
                    next.delete(key);
                }
                else {
                    next.set(key, item);
                }
            }
            return next;
        }, { replace: true });
    }
    function setPage(nextPage) {
        replace({ page: nextPage <= 1 ? null : String(nextPage) });
    }
    return { text, page, replace, setPage };
}
