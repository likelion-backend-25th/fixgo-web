import { apiFetch, isId, isRecord, mapSpringPage, readApiJson, type SpringPage } from "@/lib/apiClient";

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
  query: { partName: string; page: number; size: number },
  signal: AbortSignal,
): Promise<SpringPage<PartItem>> {
  const params = new URLSearchParams({
    page: String(query.page - 1),
    size: String(query.size),
  });
  const response = await apiFetch(`/api/v1/part?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      partName: query.partName === "" ? null : query.partName,
      status: null,
    }),
    signal,
  });
  const body = await readApiJson(response, "부품 목록을 불러오지 못했습니다.");
  const page = mapSpringPage(body, parseBrief, "부품 목록 응답이 올바르지 않습니다.");
  const details = await Promise.all(page.content.map((item) => fetchPart(item.id, signal)));
  return { ...page, content: details };
}

export async function fetchPart(id: number, signal?: AbortSignal): Promise<PartItem> {
  const response = await apiFetch(`/api/v1/part/${id}`, { signal });
  const body = await readApiJson(response, "부품 정보를 불러오지 못했습니다.");
  return parseDetail(body);
}

export async function updatePartPrice(id: number, unitPrice: number): Promise<void> {
  const response = await apiFetch("/api/v1/part/unit_price", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, unitPrice }),
  });
  await readApiJson(response, "부품 단가를 수정하지 못했습니다.");
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

function isStatus(value: unknown): value is PartStatus {
  return typeof value === "string" && statuses.some((status) => status === value);
}

function isWhole(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}
