import { apiFetch, isId, isRecord, readApiJson } from "@/lib/apiClient";
import type { ProductCategory } from "@/types/asReception";

export type RateType = "LABOR_RATE" | "INSPECTION_COST";

export interface LaborRateItem {
  id: number;
  productCategory: ProductCategory;
  cost: number;
  rateType: RateType;
  effectiveDate: string;
}

export async function fetchLaborRates(signal?: AbortSignal): Promise<LaborRateItem[]> {
  const response = await apiFetch("/api/v1/admin/labor-rates", { signal });
  const body = await readApiJson(response, "공임비·점검비 목록을 불러오지 못했습니다.");
  if (!Array.isArray(body)) {
    throw new Error("공임비·점검비 목록 응답이 올바르지 않습니다.");
  }
  return body.map(parseLaborRate);
}

function parseLaborRate(value: unknown): LaborRateItem {
  if (
    !isRecord(value)
    || !isId(value.id)
    || !isCategory(value.productCategory)
    || !isCost(value.cost)
    || !isRateType(value.rateType)
    || typeof value.effectiveDate !== "string"
    || value.effectiveDate.trim() === ""
  ) {
    throw new Error("공임비·점검비 목록 응답이 올바르지 않습니다.");
  }
  return {
    id: value.id,
    productCategory: value.productCategory,
    cost: value.cost,
    rateType: value.rateType,
    effectiveDate: value.effectiveDate,
  };
}

function isCategory(value: unknown): value is ProductCategory {
  return value === "LAPTOP" || value === "PHONE";
}

function isRateType(value: unknown): value is RateType {
  return value === "LABOR_RATE" || value === "INSPECTION_COST";
}

function isCost(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
