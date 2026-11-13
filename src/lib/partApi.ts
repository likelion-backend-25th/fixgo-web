import { apiFetch, isId, isRecord, mapSpringPage, readApiJson, type SpringPage } from "@/lib/apiClient";
import type { ProductCategory } from "@/types/asReception";

export type PartStatus = "ACTIVE" | "LOW_QUANTITY" | "DISCONTINUED";
export type StockMovement = "IN" | "OUT";

export interface PartItem {
  id: number;
  name: string;
  unitPrice: number;
  stockQuantity: number;
  standardMinutes: number;
  status: PartStatus;
}

const statuses: readonly PartStatus[] = ["ACTIVE", "LOW_QUANTITY", "DISCONTINUED"];

export function partStatusLabel(status: PartStatus): string {
  if (status === "ACTIVE") {
    return "사용";
  }
  if (status === "LOW_QUANTITY") {
    return "재고 부족";
  }
  return "단종";
}

export async function fetchParts(
  query: {
    partName: string;
    status?: PartStatus | null;
    category?: ProductCategory | null;
    productModelId?: number | null;
    page: number;
    size: number;
  },
  signal?: AbortSignal,
): Promise<SpringPage<PartItem>> {
  const params = new URLSearchParams({
    page: String(query.page - 1),
    size: String(query.size),
  });
  // 목록 검색은 GET 쿼리다. 본문에 넣으면 서버가 검색 조건을 받지 못한다.
  const partName = query.partName.trim();
  if (partName !== "") {
    params.set("partName", partName);
  }
  if (query.status != null) {
    params.set("status", query.status);
  }
  if (query.category != null) {
    params.set("category", query.category);
  }
  if (query.productModelId != null) {
    params.set("productModelId", String(query.productModelId));
  }
  const response = await apiFetch(`/api/v1/part?${params.toString()}`, { signal });
  const body = await readApiJson(response, "부품 목록을 불러오지 못했습니다.");
  const page = mapSpringPage(body, parseBrief, "부품 목록 응답이 올바르지 않습니다.");
  const details = await Promise.all(page.content.map((item) => fetchPart(item.id, signal)));
  return { ...page, content: details };
}

// 접수 모델과 호환 관계가 있는 부품 id만 모은다. 상세는 다시 조회하지 않는다.
export async function fetchCompatiblePartIds(
  productModelId: number,
  signal?: AbortSignal,
): Promise<Set<number>> {
  const ids = new Set<number>();
  let page = 0;
  let totalPages = 1;
  while (page < totalPages) {
    const params = new URLSearchParams({
      page: String(page),
      size: "200",
      productModelId: String(productModelId),
    });
    const response = await apiFetch(`/api/v1/part?${params.toString()}`, { signal });
    const body = await readApiJson(response, "호환 부품을 불러오지 못했습니다.");
    const result = mapSpringPage(body, parseBrief, "호환 부품 응답이 올바르지 않습니다.");
    for (const part of result.content) {
      ids.add(part.id);
    }
    totalPages = result.totalPages;
    page += 1;
  }
  return ids;
}

export async function fetchPart(id: number, signal?: AbortSignal): Promise<PartItem> {
  const response = await apiFetch(`/api/v1/part/${id}`, { signal });
  const body = await readApiJson(response, "부품 정보를 불러오지 못했습니다.");
  return parseDetail(body);
}

export async function updatePartMinutes(id: number, standardMinutes: number): Promise<void> {
  const response = await apiFetch("/api/v1/part/standard_minutes", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, standardMinutes }),
  });
  await readApiJson(response, "표준 작업시간을 수정하지 못했습니다.");
}

export async function applyRepairPartStock(repairId: number): Promise<void> {
  const params = new URLSearchParams({ repairId: String(repairId) });
  const response = await apiFetch(`/api/v1/part/stocks?${params.toString()}`, { method: "PATCH" });
  await readApiJson(response, "수리에 사용한 부품 재고를 반영하지 못했습니다.");
}

export async function updatePartPrice(id: number, unitPrice: number): Promise<void> {
  const response = await apiFetch("/api/v1/part/unit_price", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, unitPrice }),
  });
  await readApiJson(response, "부품 단가를 수정하지 못했습니다.");
}

export async function updatePartStatus(id: number, status: PartStatus): Promise<void> {
  const response = await apiFetch("/api/v1/part/status", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status }),
  });
  await readApiJson(response, "부품 상태를 수정하지 못했습니다.");
}

export async function updatePartStock(
  id: number,
  movementType: StockMovement,
  quantity: number,
  reason: string,
): Promise<void> {
  const response = await apiFetch("/api/v1/part/stock", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, movementType, quantity, reason }),
  });
  await readApiJson(response, "부품 재고를 수정하지 못했습니다.");
}

function parseBrief(value: unknown): { id: number; name: string; unitPrice: number; stockQuantity: number } {
  if (
    !isRecord(value)
    || !isId(value.id)
    || typeof value.name !== "string"
    || !isWhole(value.unitPrice)
    || !isWhole(value.stockQuantity)
  ) {
    throw new Error("부품 목록 응답이 올바르지 않습니다.");
  }
  return {
    id: value.id,
    name: value.name,
    unitPrice: value.unitPrice,
    stockQuantity: value.stockQuantity,
  };
}

function parseDetail(value: unknown): PartItem {
  const brief = parseBrief(value);
  if (!isRecord(value) || !isWhole(value.standardMinutes) || !isStatus(value.status)) {
    throw new Error("부품 정보 응답이 올바르지 않습니다.");
  }
  return {
    ...brief,
    standardMinutes: value.standardMinutes,
    status: value.status,
  };
}

export function isPartStatus(value: string): value is PartStatus {
  return statuses.some((status) => status === value);
}

function isStatus(value: unknown): value is PartStatus {
  return typeof value === "string" && statuses.some((status) => status === value);
}

function isWhole(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}
