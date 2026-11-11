import { useEffect, useState } from "react";
import { isAbortError } from "@/lib/apiClient";

export function useStatisticsResource<T>(
  load: (startDate: string, endDate: string, signal: AbortSignal) => Promise<T>,
  startDate: string,
  endDate: string,
  invalid: boolean,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!invalid);
  const [error, setError] = useState("");

  useEffect(() => {
    if (invalid) {
      setData(null);
      setLoading(false);
      setError("");
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");
    load(startDate, endDate, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) {
          setData(value);
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) {
          return;
        }
        setData(null);
        setError(cause instanceof Error ? cause.message : "통계를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [endDate, invalid, load, startDate]);

  return { data, loading, error };
}
