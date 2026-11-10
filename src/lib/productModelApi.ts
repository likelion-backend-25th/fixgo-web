import { apiFetch, isAbortError, isId, isRecord, readErrorMessage } from "@/lib/apiClient";
import type { ProductCategory } from "@/types/asReception";
import type {
  CreateProductModelInput,
  ProductModel,
  ProductModelListQuery,
  ProductModelListResult,
  UpdateProductModelInput,
} from "@/types/productModel";

const categories: readonly ProductCategory[] = ["LAPTOP", "PHONE"];

export function productModelStatusLabel(isActive: boolean): string {
  return isActive ? "사용" : "단종";
}

export function categoryToLabel(category: ProductCategory): string {
  return category === "LAPTOP" ? "노트북" : "스마트폰";
}

export async function fetchProductModels(
  query: ProductModelListQuery,
  signal: AbortSignal,
): Promise<ProductModelListResult> {
  const params = new URLSearchParams({
    page: String(query.page - 1),
    size: String(query.size),
  });
  if (query.keyword.trim() !== "") {
    params.set("keyword", query.keyword.trim());
  }

  const response = await apiFetch(`/api/v1/admin/products/list?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "지원 품목 목록을 불러오지 못했습니다."));
  }

  const body = await readJson(response, "지원 품목 목록 응답이 올바르지 않습니다.");
  if (!isPage(body)) {
    throw new Error("지원 품목 목록 응답이 올바르지 않습니다.");
  }

  return {
    items: body.content.map(parseProductModel),
    number: body.number,
    size: body.size,
    totalElements: body.totalElements,
    totalPages: body.totalPages,
  };
}

export async function createProductModel(input: CreateProductModelInput): Promise<ProductModel> {
  const response = await apiFetch("/api/v1/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "모델을 등록하지 못했습니다."));
  }
  return parseProductModel(await readJson(response, "모델 등록 응답이 올바르지 않습니다."));
}

export async function updateProductModel(
  id: number,
  input: UpdateProductModelInput,
): Promise<ProductModel> {
  const response = await apiFetch(`/api/v1/admin/products/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "모델을 수정하지 못했습니다."));
  }
  return parseProductModel(await readJson(response, "모델 수정 응답이 올바르지 않습니다."));
}

function parseProductModel(value: unknown): ProductModel {
  if (
    !isRecord(value)
    || !isId(value.id)
    || typeof value.name !== "string"
    || typeof value.modelName !== "string"
    || !isCategory(value.category)
    || !isWholeNumber(value.warrantyMonths)
    || typeof value.createdAt !== "string"
    || !isNullableString(value.updatedAt)
  ) {
    throw new Error("지원 품목 응답이 올바르지 않습니다.");
  }
  const isActive = readIsActive(value);
  if (isActive === null) {
    throw new Error("지원 품목 응답이 올바르지 않습니다.");
  }
  return {
    id: value.id,
    name: value.name,
    modelName: value.modelName,
    category: value.category,
    warrantyMonths: value.warrantyMonths,
    isActive,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function readIsActive(value: Record<string, unknown>): boolean | null {
  if (typeof value.isActive === "boolean") return value.isActive;
  if (typeof value.active === "boolean") return value.active;
  return null;
}

function isCategory(value: unknown): value is ProductCategory {
  return typeof value === "string" && categories.some((item) => item === value);
}

function isPage(value: unknown): value is {
  content: unknown[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
} {
  return isRecord(value)
    && Array.isArray(value.content)
    && Number.isInteger(value.number)
    && Number.isInteger(value.size)
    && typeof value.totalElements === "number"
    && Number.isFinite(value.totalElements)
    && Number.isInteger(value.totalPages);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

async function readJson(response: Response, fallback: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (error: unknown) {
    if (isAbortError(error)) throw error;
    throw new Error(fallback);
  }
}
