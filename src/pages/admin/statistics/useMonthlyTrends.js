import { useEffect, useState } from "react";
import { isAbortError } from "@/lib/apiClient";
import { fetchPaymentStatistics, fetchReceptionStatistics } from "@/lib/statisticsApi";
import { monthSlices } from "@/lib/statisticsMonths";
// 월별 시계열 API가 없어서, 조회 기간을 달로 나눠 접수 통계와 결제 통계를 다시 조회한다.
export function useMonthlyTrends(startDate, endDate, invalid) {
    const [points, setPoints] = useState(null);
    const [loading, setLoading] = useState(!invalid);
    const [error, setError] = useState("");
    useEffect(() => {
        if (invalid) {
            setPoints(null);
            setLoading(false);
            setError("");
            return;
        }
        const slices = monthSlices(startDate, endDate);
        const controller = new AbortController();
        setLoading(true);
        setError("");
        Promise.all(slices.map(async (slice) => {
            const [reception, payment] = await Promise.all([
                fetchReceptionStatistics(slice.startDate, slice.endDate, controller.signal),
                fetchPaymentStatistics(slice.startDate, slice.endDate, controller.signal),
            ]);
            return {
                label: slice.label,
                receivedCount: reception.receivedCount,
                completedCount: reception.completedCount,
                paidAmount: payment.totalPaidAmount,
            };
        }))
            .then((value) => {
            if (!controller.signal.aborted) {
                setPoints(value);
            }
        })
            .catch((cause) => {
            if (controller.signal.aborted || isAbortError(cause)) {
                return;
            }
            setPoints(null);
            setError(cause instanceof Error ? cause.message : "월별 통계를 불러오지 못했습니다.");
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [endDate, invalid, startDate]);
    return { points, loading, error };
}
