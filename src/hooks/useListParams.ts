import { useSearchParams } from "react-router";

// 목록을 벗어나면 컴포넌트 상태는 사라진다. 주소에 남기면 뒤로 가기가 필터를 복원한다.
export function useListParams() {
  const [params, setParams] = useSearchParams();

  function text(key: string, fallback = ""): string {
    return params.get(key) ?? fallback;
  }

  function page(): number {
    const raw = Number(params.get("page"));
    return Number.isInteger(raw) && raw > 0 ? raw : 1;
  }

  function replace(updates: Record<string, string | null>) {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, item] of Object.entries(updates)) {
        if (item === null || item === "") {
          next.delete(key);
        } else {
          next.set(key, item);
        }
      }
      return next;
    }, { replace: true });
  }

  function setPage(nextPage: number) {
    replace({ page: nextPage <= 1 ? null : String(nextPage) });
  }

  return { text, page, replace, setPage };
}
