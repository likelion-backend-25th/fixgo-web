import { apiFetch, isAbortError, isId, isRecord, readErrorMessage } from "@/lib/apiClient";
import type { ProductCategory, ProductSummary } from "@/types/asReception";

const categories: readonly ProductCategory[] = ["LAPTOP", "PHONE"];

export function categoryLabel(category: ProductCategory): string {
  return category === "LAPTOP" ? "노트북" : "스마트폰";
}

/** 고객 보유 제품 목록 */
export async function listProductsByCustomer(
  customerId: number,
  signal: AbortSignal,
): Promise<ProductSummary[]> {
  const response = await apiFetch(`/api/v1/products/by-customer/${customerId}`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "고객 보유 제품을 불러오지 못했습니다."));
  }
  const body = await readJson(response, "고객 보유 제품 응답이 올바르지 않습니다.");
  if (!Array.isArray(body)) {
    throw new Error("고객 보유 제품 응답이 올바르지 않습니다.");
  }
  return body.map(parseProductSummary);
}

function parseProductSummary(value: unknown): ProductSummary {
  if (
    !isRecord(value)
    || !isId(value.id)
    || typeof value.serialNumber !== "string"
    || typeof value.modelName !== "string"
    || typeof value.name !== "string"
    || !isCategory(value.category)
    || !isNullableString(value.manufacturedAt)
    || !isNullableString(value.purchasedAt)
    || !isWarrantyMonths(value.warrantyMonths)
  ) {
    throw new Error("제품 응답이 올바르지 않습니다.");
  }

  return {
    id: value.id,
    serialNumber: value.serialNumber,
    modelName: value.modelName,
    name: value.name,
    category: value.category,
    manufacturedAt: value.manufacturedAt,
    purchasedAt: value.purchasedAt,
    warrantyMonths: value.warrantyMonths,
  };
}

function isWarrantyMonths(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isInteger(value) && value >= 0);
}
function isCategory(value: unknown): value is ProductCategory {
  return typeof value === "string" && categories.some((item) => item === value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

async function readJson(response: Response, fallback: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (error: unknown) {
    if (isAbortError(error)) throw error;
    throw new Error(fallback);
  }
}
