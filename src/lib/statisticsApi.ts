import { apiFetch, isAbortError, isId, isRecord, readErrorMessage } from "@/lib/apiClient";
import { listStatisticsMonths } from "@/lib/statisticsPeriod";
import type {
  ModelStatistics,
  ModelSymptomStatistics,
  MonthlyStatistics,
  PaymentStatistics,
  ReceptionStatistics,
  ShipmentStatistics,
  TechnicianStatistics,
} from "@/types/statistics";

export async function fetchReceptionStatistics(
  startDate: string,
  endDate: string,
  signal: AbortSignal,
): Promise<ReceptionStatistics> {
  const body = await getStatistics("/receptions", startDate, endDate, signal, "접수 통계를 불러오지 못했습니다.");
  if (!isRecord(body) || !matchesPeriod(body, startDate, endDate)) {
    throw new Error("접수 통계 응답이 올바르지 않습니다.");
  }
  const receivedCount = body.receivedCount;
  const completedCount = body.completedCount;
  const completionRate = body.completionRate;
  if (!isCount(receivedCount) || !isCount(completedCount) || !isRate(completionRate)) {
    throw new Error("접수 통계 응답이 올바르지 않습니다.");
  }
  return { startDate, endDate, receivedCount, completedCount, completionRate };
}

export async function fetchTechnicianStatistics(
  startDate: string,
  endDate: string,
  signal: AbortSignal,
): Promise<TechnicianStatistics[]> {
  const body = await getStatistics("/technicians", startDate, endDate, signal, "기사 통계를 불러오지 못했습니다.");
  if (!Array.isArray(body)) {
    throw new Error("기사 통계 응답이 올바르지 않습니다.");
  }
  return body.map(parseTechnician);
}

export async function fetchModelStatistics(
  startDate: string,
  endDate: string,
  signal: AbortSignal,
): Promise<ModelStatistics[]> {
  const body = await getStatistics("/models", startDate, endDate, signal, "모델 통계를 불러오지 못했습니다.");
  if (!Array.isArray(body)) {
    throw new Error("모델 통계 응답이 올바르지 않습니다.");
  }
  return body.map(parseModel);
}

export async function fetchModelSymptomStatistics(
  modelId: number,
  startDate: string,
  endDate: string,
  signal: AbortSignal,
): Promise<ModelSymptomStatistics[]> {
  const body = await getStatistics(
    `/models/${modelId}/symptoms`,
    startDate,
    endDate,
    signal,
    "고장 증상 통계를 불러오지 못했습니다.",
  );
  if (!Array.isArray(body)) {
    throw new Error("고장 증상 통계 응답이 올바르지 않습니다.");
  }
  return body.map(parseSymptom);
}

export async function fetchPaymentStatistics(
  startDate: string,
  endDate: string,
  signal: AbortSignal,
): Promise<PaymentStatistics> {
  const body = await getStatistics("/payments", startDate, endDate, signal, "결제 통계를 불러오지 못했습니다.");
  if (!isRecord(body) || !matchesPeriod(body, startDate, endDate)) {
    throw new Error("결제 통계 응답이 올바르지 않습니다.");
  }
  const totalPaidAmount = body.totalPaidAmount;
  const totalRefundAmount = body.totalRefundAmount;
  const netCollectedAmount = body.netCollectedAmount;
  const unpaidCount = body.unpaidCount;
  if (!isCount(totalPaidAmount) || !isCount(totalRefundAmount) || !isAmount(netCollectedAmount) || !isCount(unpaidCount)) {
    throw new Error("결제 통계 응답이 올바르지 않습니다.");
  }
  return { startDate, endDate, totalPaidAmount, totalRefundAmount, netCollectedAmount, unpaidCount };
}

export async function fetchMonthlyStatistics(
  startDate: string,
  endDate: string,
  signal: AbortSignal,
): Promise<MonthlyStatistics[]> {
  const months = listStatisticsMonths(startDate, endDate);
  return Promise.all(months.map(async (month) => {
    const [reception, payment] = await Promise.all([
      fetchReceptionStatistics(month.startDate, month.endDate, signal),
      fetchPaymentStatistics(month.startDate, month.endDate, signal),
    ]);
    return {
      label: month.label,
      receivedCount: reception.receivedCount,
      completedCount: reception.completedCount,
      revenue: payment.netCollectedAmount,
    };
  }));
}

export async function fetchShipmentStatistics(
  startDate: string,
  endDate: string,
  signal: AbortSignal,
): Promise<ShipmentStatistics> {
  const body = await getStatistics("/shipments", startDate, endDate, signal, "배송 통계를 불러오지 못했습니다.");
  if (!isRecord(body) || !matchesPeriod(body, startDate, endDate)) {
    throw new Error("배송 통계 응답이 올바르지 않습니다.");
  }
  const readyCount = body.readyCount;
  const shippingCount = body.shippingCount;
  const completedCount = body.completedCount;
  if (!isCount(readyCount) || !isCount(shippingCount) || !isCount(completedCount)) {
    throw new Error("배송 통계 응답이 올바르지 않습니다.");
  }
  return { startDate, endDate, readyCount, shippingCount, completedCount };
}

async function getStatistics(
  path: string,
  startDate: string,
  endDate: string,
  signal: AbortSignal,
  fallback: string,
): Promise<unknown> {
  const query = new URLSearchParams({ startDate, endDate });
  const response = await apiFetch(`/api/v1/admin/statistics${path}?${query.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallback));
  }
  try {
    return await response.json();
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error(fallback);
  }
}

function parseTechnician(value: unknown): TechnicianStatistics {
  if (
    !isRecord(value)
    || !isId(value.technicianId)
    || typeof value.technicianName !== "string"
    || !isCount(value.assignedCount)
    || !isCount(value.completedCount)
    || !isCount(value.inProgressCount)
    || !isNullableDuration(value.averageDurationMinutes)
    || !isCount(value.revenue)
  ) {
    throw new Error("기사 통계 응답이 올바르지 않습니다.");
  }
  return {
    technicianId: value.technicianId,
    technicianName: value.technicianName,
    assignedCount: value.assignedCount,
    completedCount: value.completedCount,
    inProgressCount: value.inProgressCount,
    averageDurationMinutes: value.averageDurationMinutes,
    revenue: value.revenue,
  };
}

function parseModel(value: unknown): ModelStatistics {
  if (
    !isRecord(value)
    || !isId(value.modelId)
    || typeof value.modelName !== "string"
    || typeof value.productGroup !== "string"
    || !isCount(value.receptionCount)
    || !isCount(value.completedCount)
    || !isCount(value.inProgressCount)
    || (value.mainSymptom !== null && typeof value.mainSymptom !== "string")
  ) {
    throw new Error("모델 통계 응답이 올바르지 않습니다.");
  }
  return {
    modelId: value.modelId,
    modelName: value.modelName,
    productGroup: value.productGroup,
    receptionCount: value.receptionCount,
    completedCount: value.completedCount,
    inProgressCount: value.inProgressCount,
    mainSymptom: value.mainSymptom,
  };
}

function parseSymptom(value: unknown): ModelSymptomStatistics {
  if (
    !isRecord(value)
    || typeof value.symptomName !== "string"
    || value.symptomName.trim() === ""
    || !isCount(value.count)
    || !isRate(value.percentage)
  ) {
    throw new Error("고장 증상 통계 응답이 올바르지 않습니다.");
  }
  return {
    symptomName: value.symptomName,
    count: value.count,
    percentage: value.percentage,
  };
}

function matchesPeriod(value: Record<string, unknown>, startDate: string, endDate: string): boolean {
  return value.startDate === startDate && value.endDate === endDate;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isRate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNullableDuration(value: unknown): value is number | null {
  return value === null || isCount(value);
}
