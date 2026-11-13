import { apiFetch, isId, isRecord } from "@/lib/apiClient";

const API_BASE = "/api/v1/as/repairs";
const WORK_API_BASE = "/api/v1/as/repair-works";
const PART_USAGE_API_BASE = "/api/v1/as/repair-part-usages";
const PRESET_API_BASE = "/api/v1/as/repair-presets";
const SYMPTOM_PRESET_API_BASE = "/api/v1/as/symptom-presets";

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

  export type WarrantyResult = "FREE" | "PAID" | "UNDECIDED";

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
  estimatedMinutes: number;
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
    estimatedMinutes: number;
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
    const labels: Record<WarrantyResult, string> = {
      FREE: "무상 수리",
      PAID: "유상 수리",
      UNDECIDED: "미판정",
    };
  
    return labels[result];
  }


// ==============================
// Error Handling
// ==============================

function parseRepairWorkParts(value: unknown): Map<number, RepairPresetPart[]> {
  if (!isRecord(value) || !Array.isArray(value.repairWorks)) {
    throw new Error("수리 이력 응답이 올바르지 않습니다.");
  }
  const partsByWorkId = new Map<number, RepairPresetPart[]>();
  for (const work of value.repairWorks) {
    if (!isRecord(work) || !isId(work.repairWorkId) || !Array.isArray(work.usedParts)) {
      throw new Error("수리 이력 응답이 올바르지 않습니다.");
    }
    partsByWorkId.set(work.repairWorkId, work.usedParts.map(parseHistoryPart));
  }
  return partsByWorkId;
}

function parseHistoryPart(value: unknown): RepairPresetPart {
  if (
    !isRecord(value)
    || !isId(value.partId)
    || typeof value.partName !== "string"
    || !isWholeNumber(value.quantity)
    || !isWholeNumber(value.unitPrice)
  ) {
    throw new Error("수리 이력 응답이 올바르지 않습니다.");
  }
  return {
    partId: value.partId,
    partName: value.partName,
    quantity: value.quantity,
    stockQuantity: 0,
    standardMinutes: 0,
    unitPrice: value.unitPrice,
  };
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

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

// 작업에 실제로 등록된 부품만 돌려준다. 프리셋에 묶인 전체를 다시 펼치지 않는다.
export async function fetchRepairWorkParts(
  receptionId: number,
  signal?: AbortSignal,
): Promise<Map<number, RepairPresetPart[]>> {
  const response = await apiFetch(`/api/v1/as/repair-histories/${receptionId}`, {
    method: "GET",
    signal,
  });
  const body = await handleResponse<unknown>(response, "수리에 사용한 부품을 불러오지 못했습니다.");
  return parseRepairWorkParts(body);
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

export interface RepairPresetPartRequest {
    partId: number;
    quantity: number;
  }

  export interface RepairPresetPart {
    partId: number;
    partName: string;
    quantity: number;
    stockQuantity: number;
    standardMinutes: number;
    unitPrice: number;
  }
  
  export interface RepairPresetRequest {
    name: string;
    description?: string;
    parts?: RepairPresetPartRequest[];
    symptomIds?: number[];
  }
  
  export interface RepairPresetUpdate {
    name: string;
    description?: string;
    parts?: RepairPresetPartRequest[];
  }

  // 수리 프리셋 등록
export async function createRepairPreset(
    request: RepairPresetRequest,
  ): Promise<RepairPreset> {
    const response = await apiFetch(PRESET_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
  
    return handleResponse<RepairPreset>(
      response,
      "수리 프리셋 등록에 실패했습니다.",
    );
  }

  // 수리 프리셋 수정
export async function updateRepairPreset(
    id: number,
    request: RepairPresetUpdate,
  ): Promise<RepairPreset> {
    const response = await apiFetch(`${PRESET_API_BASE}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
  
    return handleResponse<RepairPreset>(
      response,
      "수리 프리셋 수정에 실패했습니다.",
    );
  }

  // 수리 프리셋 삭제
export async function deleteRepairPreset(id: number): Promise<void> {
    const response = await apiFetch(`${PRESET_API_BASE}/${id}`, {
      method: "DELETE",
    });
  
    await handleResponse<void>(
      response,
      "수리 프리셋 삭제에 실패했습니다.",
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

export type AbortCategory = "REPAIR_IMPOSSIBLE" | "CUSTOMER_CANCEL";

// 점검 중 수리가 불가능하면 배송 대기 또는 수령 대기로 넘긴다.
export async function abortRepair(
  repairId: number,
  request: { category: AbortCategory; reason: string },
): Promise<{ message: string }> {
  const response = await apiFetch(`${API_BASE}/${repairId}/abort`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  return handleResponse<{ message: string }>(
    response,
    "A/S를 중단하지 못했습니다.",
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


// ==============================
// Symptom Preset API
// ==============================

export interface SymptomPreset {
    id: number;
    productCategory: string;
    name: string;
  }
  
  // 고장 증상 프리셋 전체 조회
  export async function fetchSymptomPresets(
    signal?: AbortSignal,
  ): Promise<SymptomPreset[]> {
    const response = await apiFetch(SYMPTOM_PRESET_API_BASE, {
      method: "GET",
      signal,
    });
  
    return handleResponse<SymptomPreset[]>(
      response,
      "고장 증상 프리셋 목록을 불러오지 못했습니다.",
    );
  }
  
  // 증상명/제품군으로 고장 증상 프리셋 검색
  // 백엔드 @RequestParam String name에 맞춰 name으로 전달
  export async function searchSymptomPresets(
    keyword: string,
    signal?: AbortSignal,
  ): Promise<SymptomPreset[]> {
    const params = new URLSearchParams({ name: keyword });
  
    const response = await apiFetch(
      `${SYMPTOM_PRESET_API_BASE}/search?${params.toString()}`,
      {
        method: "GET",
        signal,
      },
    );
  
    return handleResponse<SymptomPreset[]>(
      response,
      "고장 증상 프리셋 검색에 실패했습니다.",
    );
  }
  
  // 선택한 증상에 연결된 수리 프리셋 조회
  export async function fetchRepairPresetsBySymptom(
    symptomId: number,
    signal?: AbortSignal,
  ): Promise<RepairPreset[]> {
    const response = await apiFetch(
      `${SYMPTOM_PRESET_API_BASE}/${symptomId}/repair-presets`,
      {
        method: "GET",
        signal,
      },
    );
  
    return handleResponse<RepairPreset[]>(
      response,
      "해당 증상의 수리 프리셋을 불러오지 못했습니다.",
    );
  }

  // 수리 프리셋에 포함된 부품 조회
export async function fetchRepairPresetParts(
    id: number,
    signal?: AbortSignal,
  ): Promise<RepairPresetPart[]> {
    const response = await apiFetch(`${PRESET_API_BASE}/${id}/parts`, {
      method: "GET",
      signal,
    });
  
    return handleResponse<RepairPresetPart[]>(
      response,
      "수리 프리셋의 부품 목록을 불러오지 못했습니다.",
    );
  }
  
// 담당 기사가 본인 수리 건을 완료한다. 재고 차감은 백엔드에서 같은 트랜잭션으로 처리한다.
export async function completeMyRepair(repairId: number): Promise<void> {
  const response = await apiFetch(`${API_BASE}/${repairId}/complete`, {
    method: "PATCH",
  });
  await handleResponse<{ message: string }>(response, "수리를 완료하지 못했습니다.");
}
