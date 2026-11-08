import { apiFetch, isAbortError, isId, isRecord, readErrorMessage } from "@/lib/apiClient";
import {
  AS_RECEPTION_STATUSES,
  REPAIR_STATUSES,
  type AsReceptionDetail,
  type AsReceptionListItem,
  type AsReceptionListQuery,
  type AsReceptionListResult,
  type AsReceptionStatus,
  type AsStatusHistory,
  type AssignmentMember,
  type CreateCustomerInput,
  type CreateReceptionInput,
  type CreateReceptionResult,
  type CustomerPortalLink,
  type CustomerSummary,
  type EstimateDocument,
  type EstimateItem,
  type ProductCategory,
  type ProductSummary,
  type ReceptionReceipt,
  type RepairPartUsage,
  type RepairStatement,
  type RepairWorkLine,
  type ReceptionCustomer,
  type ReceptionMember,
  type ReceptionProduct,
  type RepairStatus,
  type ReturnMethod,
  type TechnicianAssignmentHistory,
  type TechnicianSummary,
  type UpdateReceptionInput,
} from "@/types/asReception";

const returnMethods: readonly ReturnMethod[] = ["DELIVERY", "PICKUP"];
const categories: readonly ProductCategory[] = ["LAPTOP", "PHONE"];

export function receptionStatusLabel(status: AsReceptionStatus): string {
  if (status === "RECEIVED") return "접수";
  if (status === "INSPECTION") return "점검 중";
  if (status === "WARRANTY_REVIEW") return "보증 판정";
  if (status === "AWAITING_QUOTE_APPROVAL") return "견적 승인 대기";
  if (status === "AWAITING_REPAIR") return "수리 대기";
  if (status === "REPAIR_IN_PROGRESS") return "수리 중";
  if (status === "AWAITING_PAYMENT") return "결제 대기";
  if (status === "AWAITING_SHIPMENT") return "배송 대기";
  if (status === "AWAITING_PICKUP") return "수령 대기";
  return "완료";
}

export function returnMethodLabel(method: ReturnMethod): string {
  return method === "PICKUP" ? "방문" : "택배";
}

export function categoryLabel(category: ProductCategory): string {
  return category === "LAPTOP" ? "노트북" : "스마트폰";
}

export function historyStatusLabel(status: string | null): string {
  if (status === null || status === "") {
    return "-";
  }
  if (isReceptionStatus(status)) {
    return receptionStatusLabel(status);
  }
  return status;
}

export function isReceptionStatus(value: string): value is AsReceptionStatus {
  return AS_RECEPTION_STATUSES.some((status) => status === value);
}

export async function fetchReceptions(
  query: AsReceptionListQuery,
  signal: AbortSignal,
): Promise<AsReceptionListResult> {
  const params = new URLSearchParams();
  if (query.keyword !== "") {
    params.set("keyword", query.keyword);
  }
  if (query.status !== null) {
    params.set("status", query.status);
  }
  if (query.technicianId !== null) {
    params.set("technicianId", String(query.technicianId));
  }
  params.set("page", String(query.page - 1));
  params.set("size", String(query.size));
  params.set("sort", query.sort);

  const response = await apiFetch(`/api/v1/as-receptions?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "A/S 목록을 불러오지 못했습니다."));
  }
  const body = await readJson(response, "A/S 목록 응답이 올바르지 않습니다.");
  if (!isPage(body)) {
    throw new Error("A/S 목록 응답이 올바르지 않습니다.");
  }
  return {
    items: body.content.map(parseListItem),
    number: body.number,
    size: body.size,
    totalElements: body.totalElements,
    totalPages: body.totalPages,
  };
}

export async function fetchReception(id: number, signal: AbortSignal): Promise<AsReceptionDetail> {
  const response = await apiFetch(`/api/v1/as-receptions/${id}`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "접수 정보를 불러오지 못했습니다."));
  }
  const body = await readJson(response, "접수 상세 응답이 올바르지 않습니다.");
  return parseDetail(body);
}

export function customerPortalUrl(token: string): string {
  return `${window.location.origin}/portal/${encodeURIComponent(token)}`;
}

export async function fetchCustomerPortalLink(id: number, signal: AbortSignal): Promise<CustomerPortalLink> {
  const response = await apiFetch(`/api/v1/as-receptions/${id}/portal-link`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "고객 안내 링크를 불러오지 못했습니다."));
  }
  return parseCustomerPortalLink(await readJson(response, "고객 안내 링크 응답이 올바르지 않습니다."));
}

export async function fetchReceptionHistory(id: number, signal: AbortSignal): Promise<AsStatusHistory[]> {
  const response = await apiFetch(`/api/v1/as-receptions/${id}/history`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "상태 변경 이력을 불러오지 못했습니다."));
  }
  const body = await readJson(response, "상태 변경 이력 응답이 올바르지 않습니다.");
  if (!Array.isArray(body)) {
    throw new Error("상태 변경 이력 응답이 올바르지 않습니다.");
  }
  return body.map(parseHistory);
}

export async function createReception(input: CreateReceptionInput): Promise<CreateReceptionResult> {
  const response = await apiFetch("/api/v1/as-receptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerId: input.customerId,
      productId: input.productId,
      technicianId: input.technicianId,
      symptom: input.symptom,
      symptomDetail: input.symptomDetail,
      memo: input.memo,
      returnMethod: input.returnMethod,
    }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "접수를 등록하지 못했습니다."));
  }
  const body = await readJson(response, "접수 등록 응답이 올바르지 않습니다.");
  if (!isRecord(body) || !isId(body.id) || typeof body.receptionNumber !== "string" || !isReceptionStatusValue(body.status) || typeof body.createdAt !== "string") {
    throw new Error("접수 등록 응답이 올바르지 않습니다.");
  }
  return {
    id: body.id,
    receptionNumber: body.receptionNumber,
    status: body.status,
    createdAt: body.createdAt,
  };
}

export async function fetchTechnicianHistory(id: number, signal: AbortSignal): Promise<TechnicianAssignmentHistory[]> {
  const response = await apiFetch(`/api/v1/as-receptions/${id}/technician-history`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "기사 배정 이력을 불러오지 못했습니다."));
  }
  const body = await readJson(response, "기사 배정 이력 응답이 올바르지 않습니다.");
  if (!Array.isArray(body)) {
    throw new Error("기사 배정 이력 응답이 올바르지 않습니다.");
  }
  return body.map(parseTechnicianHistory);
}

export async function updateReception(id: number, input: UpdateReceptionInput): Promise<void> {
  const response = await apiFetch(`/api/v1/as-receptions/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      symptom: input.symptom.trim(),
      symptomDetail: input.symptomDetail.trim(),
      memo: input.memo.trim(),
      returnMethod: input.returnMethod,
    }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "접수 정보를 수정하지 못했습니다."));
  }
}

export async function reassignTechnician(id: number, technicianId: number, reason: string): Promise<void> {
  const response = await apiFetch(`/api/v1/as-receptions/${id}/technician`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ technicianId, reason: reason.trim() }),
  });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "기사를 다시 배정하지 못했습니다."));
  }
}

export async function changeReceptionStatus(id: number, newStatus: AsReceptionStatus, reason: string): Promise<void> {
  const params = new URLSearchParams({ newStatus });
  if (reason.trim() !== "") {
    params.set("reason", reason.trim());
  }
  const response = await apiFetch(`/api/v1/as-receptions/${id}/status?${params.toString()}`, { method: "PATCH" });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "접수 상태를 변경하지 못했습니다."));
  }
}

export async function searchCustomers(query: string, signal: AbortSignal): Promise<CustomerSummary[]> {
  const trimmed = query.trim();
  if (trimmed === "") {
    return [];
  }
  const params = new URLSearchParams();
  if (trimmed.includes("@")) {
    params.set("email", trimmed);
  } else if (/^[0-9-]+$/.test(trimmed)) {
    params.set("phone", trimmed);
  } else {
    params.set("name", trimmed);
  }
  const response = await apiFetch(`/api/v1/customers?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "고객을 조회하지 못했습니다."));
  }
  const body = await readJson(response, "고객 조회 응답이 올바르지 않습니다.");
  if (!Array.isArray(body)) {
    throw new Error("고객 조회 응답이 올바르지 않습니다.");
  }
  return body.map(parseCustomerSummary);
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
  const body = await readJson(response, "고객 등록 응답이 올바르지 않습니다.");
  return parseCustomerSummary(body);
}

export async function searchProductsBySerial(serialNumber: string, signal: AbortSignal): Promise<ProductSummary[]> {
  const serial = serialNumber.trim();
  if (serial === "") {
    return [];
  }
  const params = new URLSearchParams({ serialNumber: serial });
  const response = await apiFetch(`/api/v1/products?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "제품을 조회하지 못했습니다."));
  }
  const body = await readJson(response, "제품 조회 응답이 올바르지 않습니다.");
  if (!Array.isArray(body)) {
    throw new Error("제품 조회 응답이 올바르지 않습니다.");
  }
  return body.map(parseProductSummary);
}

export async function searchProductBySerial(serialNumber: string, signal: AbortSignal): Promise<ProductSummary | null> {
  const items = await searchProductsBySerial(serialNumber, signal);
  return items[0] ?? null;
}

export async function fetchProduct(id: number, signal: AbortSignal): Promise<ProductSummary> {
  const response = await apiFetch(`/api/v1/products/${id}`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "제품 정보를 불러오지 못했습니다."));
  }
  const body = await readJson(response, "제품 정보 응답이 올바르지 않습니다.");
  return parseProductSummary(body);
}

export async function fetchReceptionReceipt(id: number, signal: AbortSignal): Promise<ReceptionReceipt> {
  const response = await apiFetch(`/api/v1/as-receptions/${id}/documents/reception-receipt`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "접수증을 불러오지 못했습니다."));
  }
  const body = await readJson(response, "접수증 응답이 올바르지 않습니다.");
  return parseReceptionReceipt(body);
}

export async function fetchEstimate(id: number, signal: AbortSignal): Promise<EstimateDocument> {
  const response = await apiFetch(`/api/v1/as-receptions/${id}/documents/estimate`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "견적서를 불러오지 못했습니다."));
  }
  const body = await readJson(response, "견적서 응답이 올바르지 않습니다.");
  return parseEstimate(body);
}

export async function fetchRepairStatement(id: number, signal: AbortSignal): Promise<RepairStatement> {
  const response = await apiFetch(`/api/v1/as-receptions/${id}/documents/repair-statement`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "수리 내역서를 불러오지 못했습니다."));
  }
  const body = await readJson(response, "수리 내역서 응답이 올바르지 않습니다.");
  return parseRepairStatement(body);
}

export async function searchTechnicians(keyword: string, signal: AbortSignal): Promise<TechnicianSummary[]> {
  const params = new URLSearchParams({ role: "ROLE_TECHNICIAN", page: "0", size: "50" });
  if (keyword.trim() !== "") {
    params.set("keyword", keyword.trim());
  }
  const response = await apiFetch(`/api/v1/member?${params.toString()}`, { signal });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "기사 목록을 불러오지 못했습니다."));
  }
  const body = await readJson(response, "기사 목록 응답이 올바르지 않습니다.");
  if (!isRecord(body) || !Array.isArray(body.content)) {
    throw new Error("기사 목록 응답이 올바르지 않습니다.");
  }
  return body.content.map(parseTechnician);
}

function parseListItem(value: unknown): AsReceptionListItem {
  if (!isRecord(value)
    || !isId(value.id)
    || typeof value.receptionNumber !== "string"
    || typeof value.createdAt !== "string"
    || typeof value.customerName !== "string"
    || typeof value.customerPhone !== "string"
    || !isNullableString(value.modelName)
    || !isReceptionStatusValue(value.receptionStatus)
    || !isRepairStatus(value.repairStatus)
    || !isNullableString(value.technicianName)) {
    throw new Error("A/S 목록 응답이 올바르지 않습니다.");
  }
  return {
    id: value.id,
    receptionNumber: value.receptionNumber,
    createdAt: value.createdAt,
    customerName: value.customerName,
    customerPhone: value.customerPhone,
    modelName: value.modelName,
    receptionStatus: value.receptionStatus,
    repairStatus: value.repairStatus,
    technicianName: value.technicianName,
  };
}

function parseDetail(value: unknown): AsReceptionDetail {
  if (!isRecord(value)
    || !isId(value.id)
    || typeof value.receptionNumber !== "string"
    || typeof value.createdAt !== "string"
    || !isReceptionStatusValue(value.status)
    || typeof value.symptom !== "string"
    || typeof value.symptomDetail !== "string"
    || !isNullableString(value.memo)
    || !isReturnMethod(value.returnMethod)
    || !isNullableString(value.fileUrl)) {
    throw new Error("접수 상세 응답이 올바르지 않습니다.");
  }
  return {
    id: value.id,
    receptionNumber: value.receptionNumber,
    createdAt: value.createdAt,
    customer: parseCustomer(value.customer),
    product: parseProduct(value.product),
    receptionist: parseMember(value.receptionist),
    technician: parseMember(value.technician),
    status: value.status,
    symptom: value.symptom,
    symptomDetail: value.symptomDetail,
    memo: value.memo,
    returnMethod: value.returnMethod,
    fileUrl: value.fileUrl,
  };
}

function parseHistory(value: unknown): AsStatusHistory {
  if (!isRecord(value)
    || !isId(value.id)
    || !isNullableString(value.fromStatus)
    || typeof value.toStatus !== "string"
    || !isNullableString(value.reason)
    || !isNullableString(value.changedBy)
    || typeof value.createdAt !== "string") {
    throw new Error("상태 변경 이력 응답이 올바르지 않습니다.");
  }
  return {
    id: value.id,
    fromStatus: value.fromStatus,
    toStatus: value.toStatus,
    reason: value.reason,
    changedBy: value.changedBy,
    createdAt: value.createdAt,
  };
}

function parseCustomer(value: unknown): ReceptionCustomer {
  const summary = parseCustomerSummary(value);
  return summary;
}

function parseCustomerSummary(value: unknown): CustomerSummary {
  if (!isRecord(value)
    || !isId(value.id)
    || typeof value.name !== "string"
    || typeof value.phone !== "string"
    || typeof value.email !== "string"
    || !isNullableString(value.zipcode)
    || !isNullableString(value.basicAddress)
    || !isNullableString(value.detailAddress)) {
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

function parseProduct(value: unknown): ReceptionProduct {
  if (!isRecord(value)
    || !isId(value.id)
    || typeof value.serialNumber !== "string"
    || !isId(value.productModelId)
    || !isNullableString(value.purchasedAt)) {
    throw new Error("접수 상세 응답이 올바르지 않습니다.");
  }
  return {
    id: value.id,
    serialNumber: value.serialNumber,
    productModelId: value.productModelId,
    purchasedAt: value.purchasedAt,
  };
}

function parseCustomerPortalLink(value: unknown): CustomerPortalLink {
  if (!isRecord(value) || typeof value.token !== "string" || value.token.trim() === "" || typeof value.expiresAt !== "string") {
    throw new Error("고객 안내 링크 응답이 올바르지 않습니다.");
  }
  return { token: value.token, expiresAt: value.expiresAt };
}

function parseProductSummary(value: unknown): ProductSummary {
  if (!isRecord(value)
    || !isId(value.id)
    || typeof value.serialNumber !== "string"
    || typeof value.modelName !== "string"
    || typeof value.name !== "string"
    || !isCategory(value.category)
    || !isNullableString(value.purchasedAt)) {
    throw new Error("제품 응답이 올바르지 않습니다.");
  }
  return {
    id: value.id,
    serialNumber: value.serialNumber,
    modelName: value.modelName,
    name: value.name,
    category: value.category,
    purchasedAt: value.purchasedAt,
  };
}

function parseMember(value: unknown): ReceptionMember | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isRecord(value) || !isId(value.id) || typeof value.name !== "string") {
    throw new Error("접수 상세 응답이 올바르지 않습니다.");
  }
  return { id: value.id, name: value.name };
}

function parseTechnicianHistory(value: unknown): TechnicianAssignmentHistory {
  if (!isRecord(value)
    || !isId(value.receptionId)
    || !isNullableString(value.reason)
    || typeof value.createdAt !== "string") {
    throw new Error("기사 배정 이력 응답이 올바르지 않습니다.");
  }
  return {
    receptionId: value.receptionId,
    previousTechnician: parseAssignmentMember(value.previousTechnician),
    newTechnician: parseAssignmentMember(value.newTechnician),
    reason: value.reason,
    createdAt: value.createdAt,
    changedBy: parseAssignmentMember(value.changedBy),
  };
}

function parseAssignmentMember(value: unknown): AssignmentMember | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isRecord(value) || !isId(value.id) || typeof value.name !== "string") {
    throw new Error("기사 배정 이력 응답이 올바르지 않습니다.");
  }
  return { id: value.id, name: value.name };
}

function parseReceptionReceipt(value: unknown): ReceptionReceipt {
  if (!isRecord(value)
    || typeof value.receptionNumber !== "string"
    || typeof value.createdAt !== "string"
    || typeof value.customerName !== "string"
    || typeof value.customerPhone !== "string"
    || typeof value.customerEmail !== "string"
    || !isNullableString(value.zipcode)
    || !isNullableString(value.basicAddress)
    || !isNullableString(value.detailAddress)
    || typeof value.modelName !== "string"
    || typeof value.serialNumber !== "string"
    || typeof value.symptom !== "string"
    || !isReturnMethod(value.returnMethod)
    || typeof value.receptionistName !== "string"
    || !isNullableString(value.technicianName)) {
    throw new Error("접수증 응답이 올바르지 않습니다.");
  }
  return {
    receptionNumber: value.receptionNumber,
    createdAt: value.createdAt,
    customerName: value.customerName,
    customerPhone: value.customerPhone,
    customerEmail: value.customerEmail,
    zipcode: value.zipcode,
    basicAddress: value.basicAddress,
    detailAddress: value.detailAddress,
    modelName: value.modelName,
    serialNumber: value.serialNumber,
    symptom: value.symptom,
    returnMethod: value.returnMethod,
    receptionistName: value.receptionistName,
    technicianName: value.technicianName,
  };
}

function parseEstimate(value: unknown): EstimateDocument {
  if (!isRecord(value)
    || !isId(value.receptionId)
    || typeof value.receptionNumber !== "string"
    || !isNullableString(value.confirmedAt)
    || !isWholeNumber(value.laborRate)
    || !isWholeNumber(value.inspectionCost)
    || !isWholeNumber(value.totalAmount)
    || !Array.isArray(value.items)) {
    throw new Error("견적서 응답이 올바르지 않습니다.");
  }
  return {
    receptionId: value.receptionId,
    receptionNumber: value.receptionNumber,
    confirmedAt: value.confirmedAt,
    laborRate: value.laborRate,
    inspectionCost: value.inspectionCost,
    totalAmount: value.totalAmount,
    items: value.items.map(parseEstimateItem),
  };
}

function parseEstimateItem(value: unknown): EstimateItem {
  if (!isRecord(value)
    || typeof value.category !== "string"
    || typeof value.name !== "string"
    || !isNullableWholeNumber(value.quantity)
    || !isNullableWholeNumber(value.amount)) {
    throw new Error("견적서 응답이 올바르지 않습니다.");
  }
  return {
    category: value.category,
    name: value.name,
    quantity: value.quantity,
    amount: value.amount,
  };
}

function parseRepairStatement(value: unknown): RepairStatement {
  if (!isRecord(value)
    || typeof value.receptionNumber !== "string"
    || typeof value.customerName !== "string"
    || typeof value.issuedAt !== "string"
    || !isNullableString(value.technicianName)
    || !isNullableString(value.workNote)
    || !Array.isArray(value.repairWorks)
    || !isWholeNumber(value.laborCost)
    || !isWholeNumber(value.finalAmount)) {
    throw new Error("수리 내역서 응답이 올바르지 않습니다.");
  }
  return {
    receptionNumber: value.receptionNumber,
    customerName: value.customerName,
    issuedAt: value.issuedAt,
    technicianName: value.technicianName,
    workNote: value.workNote,
    repairWorks: value.repairWorks.map(parseRepairWork),
    laborCost: value.laborCost,
    finalAmount: value.finalAmount,
  };
}

function parseRepairWork(value: unknown): RepairWorkLine {
  if (!isRecord(value)
    || !isId(value.repairWorkId)
    || !isNullableString(value.repairPresetName)
    || typeof value.workName !== "string"
    || !Array.isArray(value.usedParts)) {
    throw new Error("수리 내역서 응답이 올바르지 않습니다.");
  }
  return {
    repairWorkId: value.repairWorkId,
    repairPresetName: value.repairPresetName,
    workName: value.workName,
    usedParts: value.usedParts.map(parseRepairPart),
  };
}

function parseRepairPart(value: unknown): RepairPartUsage {
  if (!isRecord(value)
    || !isId(value.id)
    || typeof value.partName !== "string"
    || !isWholeNumber(value.quantity)
    || !isWholeNumber(value.totalPrice)) {
    throw new Error("수리 내역서 응답이 올바르지 않습니다.");
  }
  return {
    id: value.id,
    partName: value.partName,
    quantity: value.quantity,
    totalPrice: value.totalPrice,
  };
}

function parseTechnician(value: unknown): TechnicianSummary {
  if (!isRecord(value) || !isId(value.id) || typeof value.name !== "string" || typeof value.email !== "string" || typeof value.status !== "string") {
    throw new Error("기사 목록 응답이 올바르지 않습니다.");
  }
  return { id: value.id, name: value.name, email: value.email, status: value.status };
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

function isReceptionStatusValue(value: unknown): value is AsReceptionStatus {
  return typeof value === "string" && AS_RECEPTION_STATUSES.some((status) => status === value);
}

function isRepairStatus(value: unknown): value is RepairStatus | null {
  return value === null || (typeof value === "string" && REPAIR_STATUSES.some((status) => status === value));
}

function isReturnMethod(value: unknown): value is ReturnMethod {
  return returnMethods.some((method) => method === value);
}

function isCategory(value: unknown): value is ProductCategory {
  return categories.some((category) => category === value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isWholeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function isNullableWholeNumber(value: unknown): value is number | null {
  return value === null || isWholeNumber(value);
}

async function readJson(response: Response, fallback: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error(fallback);
  }
}
