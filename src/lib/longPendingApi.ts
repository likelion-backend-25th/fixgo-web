import { apiFetch, isAbortError, isId, isRecord, readErrorMessage } from "@/lib/apiClient";
import { isReceptionStatus } from "@/lib/asReceptionApi";
import type { LongPendingReception } from "@/types/longPending";

export async function fetchLongPendingReceptions(signal: AbortSignal): Promise<LongPendingReception[]> {
  const response = await apiFetch("/api/v1/admin/statistics/long_pending", { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "장기 미처리 목록을 불러오지 못했습니다."));
  }
  const body = await readJson(response);
  if (!Array.isArray(body)) {
    throw new Error("장기 미처리 응답이 올바르지 않습니다.");
  }
  return body.map(parseLongPending);
}

function parseLongPending(value: unknown): LongPendingReception {
  if (
    !isRecord(value)
    || !isId(value.receptionId)
    || typeof value.receptionNumber !== "string"
    || value.receptionNumber.trim() === ""
    || typeof value.customerName !== "string"
    || typeof value.modelName !== "string"
    || typeof value.status !== "string"
    || !isReceptionStatus(value.status)
    || (value.technicianName !== null && typeof value.technicianName !== "string")
    || typeof value.elapsedDays !== "number"
    || !Number.isFinite(value.elapsedDays)
    || typeof value.lastActivityAt !== "string"
    || value.lastActivityAt.trim() === ""
  ) {
    throw new Error("장기 미처리 응답이 올바르지 않습니다.");
  }
  return {
    receptionId: value.receptionId,
    receptionNumber: value.receptionNumber,
    customerName: value.customerName,
    modelName: value.modelName,
    status: value.status,
    technicianName: value.technicianName,
    elapsedDays: value.elapsedDays,
    lastActivityAt: value.lastActivityAt,
  };
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error("장기 미처리 응답이 올바르지 않습니다.");
  }
}
