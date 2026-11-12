import { apiFetch, isAbortError, isId, isRecord, readErrorMessage } from "@/lib/apiClient";
import type {
  CreateCustomerInput,
  CustomerBulkCreateItem,
  CustomerBulkCreateResult,
  CustomerBulkValidateResult,
  CustomerDetail,
  CustomerListQuery,
  CustomerListResult,
  CustomerSummary,
  UpdateCustomerInput,
} from "@/types/customer";

export function customerSearchParams(keyword: string): URLSearchParams {
  const trimmed = keyword.trim();
  const params = new URLSearchParams();
  if (trimmed === "") {
    return params;
  }
  if (trimmed.includes("@")) {
    params.set("email", trimmed);
  } else if (/^[0-9-]+$/.test(trimmed)) {
    params.set("phone", trimmed);
  } else {
    params.set("name", trimmed);
  }
  return params;
}

export async function searchCustomers(
  query: string,
  signal: AbortSignal,
): Promise<CustomerSummary[]> {
  const params = customerSearchParams(query);
  if ([...params.keys()].length === 0) {
    return [];
  }

  params.set("page", "0");
  params.set("size", "50");
  const page = await fetchCustomerPage(params, signal, "고객을 조회하지 못했습니다.", "고객 조회 응답이 올바르지 않습니다.");
  return page.content.map(parseCustomerSummary);
}

export async function searchCustomersPage(
  query: CustomerListQuery,
  signal: AbortSignal,
): Promise<CustomerListResult> {
  const params = customerSearchParams(query.keyword);
  params.set("page", String(query.page - 1));
  params.set("size", String(query.size));
  // 검색어가 없으면 백엔드 기본 정책(id desc, size 20)으로 전체 목록을 페이징한다.

  const page = await fetchCustomerPage(params, signal, "고객 목록을 불러오지 못했습니다.", "고객 목록 응답이 올바르지 않습니다.");
  return {
    items: page.content.map(parseCustomerDetail),
    number: page.number,
    size: page.size,
    totalElements: page.totalElements,
    totalPages: page.totalPages,
  };
}

// 고객 목록은 배열이 아니라 페이지로 온다.
async function fetchCustomerPage(
  params: URLSearchParams,
  signal: AbortSignal,
  fallback: string,
  invalid: string,
): Promise<{
  content: unknown[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}> {
  const response = await apiFetch(`/api/v1/customers?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallback));
  }
  const body = await readJson(response, invalid);
  if (!isPage(body)) {
    throw new Error(invalid);
  }
  return body;
}

export async function fetchCustomer(id: number, signal: AbortSignal): Promise<CustomerDetail> {
  const response = await apiFetch(`/api/v1/customers/${id}`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "고객 정보를 불러오지 못했습니다."));
  }
  return parseCustomerDetail(await readJson(response, "고객 정보 응답이 올바르지 않습니다."));
}

export async function createCustomer(input: CreateCustomerInput): Promise<CustomerSummary> {
  const response = await apiFetch("/api/v1/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "고객을 등록하지 못했습니다."));
  }
  return parseCustomerSummary(await readJson(response, "고객 등록 응답이 올바르지 않습니다."));
}

export async function updateCustomer(
  id: number,
  input: UpdateCustomerInput,
): Promise<CustomerDetail> {
  const response = await apiFetch(`/api/v1/customers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "고객 정보를 수정하지 못했습니다."));
  }
  return parseCustomerDetail(await readJson(response, "고객 수정 응답이 올바르지 않습니다."));
}

export async function downloadCustomerTemplate(): Promise<Blob> {
  const response = await apiFetch("/api/v1/customers/bulk/template");
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "엑셀 양식을 내려받지 못했습니다."));
  }
  return response.blob();
}

export async function validateCustomerBulk(file: File): Promise<CustomerBulkValidateResult> {
  const form = new FormData();
  form.append("file", file);
  const response = await apiFetch("/api/v1/customers/bulk/validate", {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "엑셀 파일을 검증하지 못했습니다."));
  }
  return parseBulkValidate(await readJson(response, "엑셀 검증 응답이 올바르지 않습니다."));
}

export async function createCustomersBulk(
  customers: CustomerBulkCreateItem[],
): Promise<CustomerBulkCreateResult> {
  const response = await apiFetch("/api/v1/customers/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customers }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "고객을 일괄 등록하지 못했습니다."));
  }
  return parseBulkCreate(await readJson(response, "고객 일괄 등록 응답이 올바르지 않습니다."));
}

export function parseCustomerSummary(value: unknown): CustomerSummary {
  if (
    !isRecord(value)
    || !isId(value.id)
    || typeof value.name !== "string"
    || typeof value.phone !== "string"
    || typeof value.email !== "string"
    || !isNullableString(value.zipcode)
    || !isNullableString(value.basicAddress)
    || !isNullableString(value.detailAddress)
  ) {
    throw new Error("고객 응답이 올바르지 않습니다.");
  }
  return {
    id: value.id,
    name: value.name,
    phone: value.phone,
    email: value.email,
    zipcode: value.zipcode,
    basicAddress: value.basicAddress,
    detailAddress: value.detailAddress,
  };
}

function parseCustomerDetail(value: unknown): CustomerDetail {
  const summary = parseCustomerSummary(value);
  if (!isRecord(value) || typeof value.createdAt !== "string" || !isNullableString(value.updatedAt)) {
    throw new Error("고객 상세 응답이 올바르지 않습니다.");
  }
  return { ...summary, createdAt: value.createdAt, updatedAt: value.updatedAt };
}

function parseBulkValidate(value: unknown): CustomerBulkValidateResult {
  if (
    !isRecord(value)
    || typeof value.fileName !== "string"
    || !isWholeNumber(value.totalCount)
    || !isWholeNumber(value.validCount)
    || !isWholeNumber(value.invalidCount)
    || !Array.isArray(value.rows)
  ) {
    throw new Error("엑셀 검증 응답이 올바르지 않습니다.");
  }
  return {
    fileName: value.fileName,
    totalCount: value.totalCount,
    validCount: value.validCount,
    invalidCount: value.invalidCount,
    rows: value.rows.map((row) => {
      if (
        !isRecord(row)
        || !isWholeNumber(row.rowNumber)
        || typeof row.name !== "string"
        || typeof row.phone !== "string"
        || typeof row.email !== "string"
        || !isNullableString(row.zipcode)
        || !isNullableString(row.basicAddress)
        || !isNullableString(row.detailAddress)
        || typeof row.registrable !== "boolean"
        || !isNullableString(row.reason)
      ) {
        throw new Error("엑셀 검증 응답이 올바르지 않습니다.");
      }
      return {
        rowNumber: row.rowNumber,
        name: row.name,
        phone: row.phone,
        email: row.email,
        zipcode: row.zipcode,
        basicAddress: row.basicAddress,
        detailAddress: row.detailAddress,
        registrable: row.registrable,
        reason: row.reason,
      };
    }),
  };
}

function parseBulkCreate(value: unknown): CustomerBulkCreateResult {
  if (
    !isRecord(value)
    || !isWholeNumber(value.successCount)
    || !isWholeNumber(value.failCount)
    || !Array.isArray(value.failures)
  ) {
    throw new Error("고객 일괄 등록 응답이 올바르지 않습니다.");
  }
  return {
    successCount: value.successCount,
    failCount: value.failCount,
    failures: value.failures.map((item) => {
      if (!isRecord(item) || !isWholeNumber(item.rowNumber) || typeof item.reason !== "string") {
        throw new Error("고객 일괄 등록 응답이 올바르지 않습니다.");
      }
      return { rowNumber: item.rowNumber, reason: item.reason };
    }),
  };
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
