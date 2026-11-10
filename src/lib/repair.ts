
import { apiFetch } from "@/lib/apiClient";

const API_BASE = "/api/v1/as/repairs";
const WORK_API_BASE = "/api/v1/as/repair-works";
const PART_USAGE_API_BASE = "/api/v1/as/repair-part-usages";
const PRESET_API_BASE = "/api/v1/as/repair-presets";

// ==============================
// Types
// ==============================

export type RepairDecision = "REPAIRABLE" | "UNREPAIRABLE";

export type RepairStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "DIAGNOSING"
  | "REPAIRING"
  | "COMPLETED";

export type WarrantyResult = "FREE" | "PAID";

export interface RepairDetail {
  id: number;
  asReceptionId: number;
  technicianId: number;
  diagnosis: string | null;
  workNote: string | null;
  repairDecision: RepairDecision | null;
  warrantyResult: WarrantyResult;
  reason: string | null;
  laborRate: number;
  inspectionCost: number;
  finalAmount: number;
  status: RepairStatus;
  reasonForRejection: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
}

export interface RepairWorkRequest {
  repairId: number;
  presetId: number | null;
  workName: string;
}

export interface RepairWorkUpdate {
  presetId: number | null;
  workName: string;
}

export interface RepairWork {
  id: number;
  repairId: number;
  repairPresetName: string | null;
  workName: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
}

export interface RepairPartUsageRequest {
  repairWorkId: number;
  partId: number;
  quantity: number;
}

export interface RepairPartUsage {
  id: number;
  repairWorkId: number;
  partId: number;
  partName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

export interface RepairPreset {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: number | null;
  updatedBy: number | null;
  basePrice: number;
}

// ==============================
// Labels
// ==============================

export function repairDecisionLabel(
  decision: RepairDecision | null,
): string {
  if (decision === "REPAIRABLE") return "수리 가능";
  if (decision === "UNREPAIRABLE") return "수리 불가능";
  return "-";
}

export function repairStatusLabel(status: RepairStatus): string {
  const labels: Record<RepairStatus, string> = {
    REQUESTED: "수리 요청",
    APPROVED: "수리 승인",
    REJECTED: "수리 반려",
    DIAGNOSING: "점검 중",
    REPAIRING: "수리 중",
    COMPLETED: "수리 완료",
  };

  return labels[status];
}

export function warrantyResultLabel(result: WarrantyResult): string {
  return result === "FREE" ? "무상 수리" : "유상 수리";
}

// ==============================
// Error Handling
// ==============================

async function handleResponse<T>(
  response: Response,
  fallbackMessage: string,
): Promise<T> {
  if (!response.ok) {
    let message = fallbackMessage;

    try {
      const body: unknown = await response.json();

      if (
        typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof body.message === "string"
      ) {
        message = body.message;
      }
    } catch {
      // 응답 본문이 JSON이 아닌 경우 기본 메시지 사용
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ==============================
// Repair API
// ==============================

// 수리 상세 조회
export async function fetchRepairDetail(
  repairId: number,
  signal?: AbortSignal,
): Promise<RepairDetail> {
  const response = await apiFetch(`${API_BASE}/${repairId}`, {
    method: "GET",
    signal,
  });

  return handleResponse<RepairDetail>(
    response,
    "수리 상세 정보를 불러오지 못했습니다.",
  );
}

// ==============================
// Repair Work API
// ==============================

// 특정 수리의 작업 목록 조회
export async function fetchRepairWorks(
  repairId: number,
  signal?: AbortSignal,
): Promise<RepairWork[]> {
  const response = await apiFetch(
    `${WORK_API_BASE}/repair/${repairId}`,
    {
      method: "GET",
      signal,
    },
  );

  return handleResponse<RepairWork[]>(
    response,
    "수리 작업 목록을 불러오지 못했습니다.",
  );
}

// 수리 작업 등록
export async function createRepairWork(
  request: RepairWorkRequest,
): Promise<RepairWork> {
  const response = await apiFetch(WORK_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  return handleResponse<RepairWork>(
    response,
    "수리 작업 등록에 실패했습니다.",
  );
}

// 수리 작업 수정
export async function updateRepairWork(
  id: number,
  request: RepairWorkUpdate,
): Promise<RepairWork> {
  const response = await apiFetch(`${WORK_API_BASE}/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  return handleResponse<RepairWork>(
    response,
    "수리 작업 수정에 실패했습니다.",
  );
}

// 수리 작업 삭제
export async function deleteRepairWork(id: number): Promise<void> {
  const response = await apiFetch(`${WORK_API_BASE}/${id}`, {
    method: "DELETE",
  });

  await handleResponse<void>(
    response,
    "수리 작업 삭제에 실패했습니다.",
  );
}

// ==============================
// Repair Part Usage API
// ==============================

// 수리 작업에 부품 사용 등록
export async function createRepairPartUsage(
  request: RepairPartUsageRequest,
): Promise<RepairPartUsage> {
  const response = await apiFetch(PART_USAGE_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  return handleResponse<RepairPartUsage>(
    response,
    "부품 사용 등록에 실패했습니다.",
  );
}

// ==============================
// Repair Preset API
// ==============================

// 수리 프리셋 전체 조회
export async function fetchRepairPresets(
  signal?: AbortSignal,
): Promise<RepairPreset[]> {
  const response = await apiFetch(PRESET_API_BASE, {
    method: "GET",
    signal,
  });

  return handleResponse<RepairPreset[]>(
    response,
    "수리 프리셋 목록을 불러오지 못했습니다.",
  );
}

// 수리 프리셋 단건 조회
export async function fetchRepairPreset(
  id: number,
  signal?: AbortSignal,
): Promise<RepairPreset> {
  const response = await apiFetch(`${PRESET_API_BASE}/${id}`, {
    method: "GET",
    signal,
  });

  return handleResponse<RepairPreset>(
    response,
    "수리 프리셋을 불러오지 못했습니다.",
  );
}

// 이름으로 수리 프리셋 검색
export async function searchRepairPresets(
  name: string,
  signal?: AbortSignal,
): Promise<RepairPreset[]> {
  const params = new URLSearchParams({ name });

  const response = await apiFetch(
    `${PRESET_API_BASE}/search?${params.toString()}`,
    {
      method: "GET",
      signal,
    },
  );

  return handleResponse<RepairPreset[]>(
    response,
    "수리 프리셋 검색에 실패했습니다.",
  );
}

// ==============================
// Repair Cost API
// ==============================

export interface RepairCostResponse {
  laborRate: number;
  inspectionCost: number;
  finalAmount: number;
}

// 최종 수리비 계산
export async function calculateRepairCost(repairId: number): Promise<RepairCostResponse> {
  const response = await apiFetch(`${API_BASE}/${repairId}/cost`, {
    method: "POST",
  });

  return handleResponse<RepairCostResponse>(
    response,
    "수리 비용 계산에 실패했습니다.",
  );
}

// 수리 비용 확정
export async function confirmRepairCost(repairId: number): Promise<{ message: string }> {
  const response = await apiFetch(`${API_BASE}/${repairId}/cost/confirm`, {
    method: "POST",
  });

  return handleResponse<{ message: string }>(
    response,
    "수리 비용 확정에 실패했습니다.",
  );
}

export interface RepairUpdateRequest {
  asReceptionId: number;
  technicianId: number;
  diagnosis: string;
  workNote: string;
  repairDecision: RepairDecision;
  warrantyResult: WarrantyResult;
  reason: string;
  laborRate: number;
  inspectionCost: number;
  finalAmount: number;
  status: RepairStatus;
  reasonForRejection: string;
}

// 점검 내용과 보증 판정을 저장한다. 상태 전이는 수리비 확정에서 한다.
export async function updateRepair(repairId: number, request: RepairUpdateRequest): Promise<void> {
  const response = await apiFetch(`${API_BASE}/${repairId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  await handleResponse<RepairDetail>(response, "점검 내용을 저장하지 못했습니다.");
}


// 고객이 견적을 승인한 뒤 담당 기사가 수리를 시작한다.
export async function completeRepair(repairId: number): Promise<void> {
  const response = await apiFetch(`${API_BASE}/${repairId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "COMPLETED" }),
  });
  await handleResponse<{ message: string }>(response, "수리를 완료하지 못했습니다.");
}

export async function startRepair(repairId: number): Promise<void> {
  const response = await apiFetch(`${API_BASE}/${repairId}/start`, {
    method: "PATCH",
  });
  await handleResponse<{ message: string }>(response, "수리를 시작하지 못했습니다.");
}


export interface RepairListItem {
  id: number;
  asReceptionId: number;
  technicianId: number;
  diagnosis: string | null;
  workNote: string | null;
  repairDecision: RepairDecision | null;
  warrantyResult: WarrantyResult;
  finalAmount: number;
  status: RepairStatus;
  createdAt: string;
}

// 본인에게 배정된 수리 목록 (기사 전용)
export async function fetchMyRepairs(signal?: AbortSignal): Promise<RepairListItem[]> {
  const response = await apiFetch(`${API_BASE}/my`, {
    method: "GET",
    signal,
  });

  return handleResponse<RepairListItem[]>(
    response,
    "내 담당 A/S 목록을 불러오지 못했습니다.",
  );
}

// 기사 본인에게 배정된 수리 상세 조회
export async function fetchMyRepairDetail(
  repairId: number,
  signal?: AbortSignal,
): Promise<RepairDetail> {
  const response = await apiFetch(`${API_BASE}/my/${repairId}`, {
    method: "GET",
    signal,
  });

  return handleResponse<RepairDetail>(
    response,
    "내 담당 수리 상세 정보를 불러오지 못했습니다.",
  );
}
