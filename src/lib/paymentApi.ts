import { apiFetch } from "@/lib/apiClient";

export type PaymentBillStatus = "UNPAID" | "PAID" | "REFUNDED" | "PARTIALLY_REFUNDED";

export type PaymentMethod = "CARD" | "VIRTUAL_ACCOUNT" | "CASH";

export type PaymentAttemptStatus = "READY" | "IN_PROGRESS" | "WAITING_FOR_DEPOSIT" | "DONE" | "FAILED";

export type PaymentRefundStatus = "IN_PROGRESS" | "DONE" | "FAILED";

export interface PaymentListItem {
  billId: number;
  asReceptionNumber: string;
  customerName: string;
  amount: number;
  status: PaymentBillStatus;
  paymentMethod: PaymentMethod | null;
  modelName: string | null;
  billedAt: string | null;
}

export interface PaymentListQuery {
  keyword: string;
  status: PaymentBillStatus | null;
  page: number;
  size: number;
}

export interface PaymentListResult {
  items: PaymentListItem[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface PaymentReception {
  asReceptionNumber: string;
  customerName: string;
  productName: string | null;
  symptom: string;
  symptomDetail: string | null;
}

export interface PaymentAccount {
  bankCode: string;
  accountNumber: string;
  dueAt: string | null;
}

export interface PaymentHistory {
  attemptId: number;
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethod | null;
  approvedAt: string | null;
}

export interface RefundHistory {
  refundId: number;
  amount: number | null;
  cancelReason: string;
  status: PaymentRefundStatus;
  canceledAt: string | null;
}

export interface PaymentDetail {
  billId: number;
  reception: PaymentReception;
  amount: number;
  status: PaymentBillStatus;
  paymentStatus: PaymentAttemptStatus | null;
  paymentMethod: PaymentMethod | null;
  virtualAccount: PaymentAccount | null;
  paymentHistory: PaymentHistory | null;
  refundHistory: RefundHistory | null;
  refundable: boolean;
}

const billStatuses: readonly PaymentBillStatus[] = ["UNPAID", "PAID", "REFUNDED", "PARTIALLY_REFUNDED"];
const paymentMethods: readonly PaymentMethod[] = ["CARD", "VIRTUAL_ACCOUNT", "CASH"];
const attemptStatuses: readonly PaymentAttemptStatus[] = ["READY", "IN_PROGRESS", "WAITING_FOR_DEPOSIT", "DONE", "FAILED"];
const refundStatuses: readonly PaymentRefundStatus[] = ["IN_PROGRESS", "DONE", "FAILED"];

export function paymentBillStatusLabel(status: PaymentBillStatus): string {
  if (status === "UNPAID") {
    return "결제 대기";
  }
  if (status === "PAID") {
    return "결제 완료";
  }
  if (status === "PARTIALLY_REFUNDED") {
    return "부분 환불";
  }
  return "환불 완료";
}

export function paymentMethodLabel(method: PaymentMethod | null): string {
  if (method === "CARD") {
    return "카드";
  }
  if (method === "VIRTUAL_ACCOUNT") {
    return "가상계좌";
  }
  if (method === "CASH") {
    return "현금";
  }
  return "-";
}

export function paymentAttemptStatusLabel(status: PaymentAttemptStatus | null): string {
  if (status === "READY") {
    return "결제 준비";
  }
  if (status === "IN_PROGRESS") {
    return "결제 진행";
  }
  if (status === "WAITING_FOR_DEPOSIT") {
    return "입금 대기";
  }
  if (status === "DONE") {
    return "승인 완료";
  }
  if (status === "FAILED") {
    return "결제 실패";
  }
  return "-";
}

export async function fetchPaymentList(query: PaymentListQuery, signal: AbortSignal): Promise<PaymentListResult> {
  const params = new URLSearchParams();
  if (query.keyword !== "") {
    params.set("keyword", query.keyword);
  }
  if (query.status !== null) {
    params.set("status", query.status);
  }
  // Spring Pageable은 0부터 세고, 화면 페이지는 1부터 센다.
  params.set("page", String(query.page - 1));
  params.set("size", String(query.size));

  let response: Response;
  try {
    response = await apiFetch(`/api/v1/payments?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error("결제 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new Error("결제 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "결제 내역을 불러오지 못했습니다."));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("결제 목록 응답이 올바르지 않습니다.");
  }
  if (!isPaymentListResult(body)) {
    throw new Error("결제 목록 응답이 올바르지 않습니다.");
  }

  return {
    items: body.content.map(parsePaymentListItem),
    number: body.number,
    size: body.size,
    totalElements: body.totalElements,
    totalPages: body.totalPages,
  };
}

export async function fetchPaymentDetail(billId: number, signal: AbortSignal): Promise<PaymentDetail> {
  let response: Response;
  try {
    response = await apiFetch(`/api/v1/payments/${billId}`, {
      headers: { Accept: "application/json" },
      signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error("결제 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new Error("결제 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "결제 정보를 불러오지 못했습니다."));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("결제 상세 응답이 올바르지 않습니다.");
  }
  if (!isPaymentDetail(body)) {
    throw new Error("결제 상세 응답이 올바르지 않습니다.");
  }
  return body;
}

export async function registerCashPayment(billId: number): Promise<void> {
  const response = await apiFetch(`/api/v1/payments/${billId}/cash`, { method: "POST" });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "현금 결제를 등록하지 못했습니다."));
  }
}

function parsePaymentListItem(value: unknown): PaymentListItem {
  if (!isRecord(value)
    || !isId(value.billId)
    || typeof value.asReceptionNumber !== "string"
    || value.asReceptionNumber === ""
    || typeof value.customerName !== "string"
    || !isAmount(value.amount)
    || !isBillStatus(value.status)
    || !isPaymentMethod(value.paymentMethod)) {
    throw new Error("결제 목록 응답이 올바르지 않습니다.");
  }
  return {
    billId: value.billId,
    asReceptionNumber: value.asReceptionNumber,
    customerName: value.customerName,
    amount: value.amount,
    status: value.status,
    paymentMethod: value.paymentMethod,
    modelName: typeof value.modelName === "string" && value.modelName !== "" ? value.modelName : null,
    billedAt: typeof value.billedAt === "string" && value.billedAt !== "" ? value.billedAt : null,
  };
}

export async function fetchDepositWaiting(signal: AbortSignal): Promise<PaymentListItem[]> {
  let response: Response;
  try {
    response = await apiFetch("/api/v1/admin/statistics/unpaid-bills", { signal });
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }
    throw error instanceof Error ? error : new Error("입금 대기 내역을 불러오지 못했습니다.");
  }
  // 주소가 없거나 토큰이 거절되면 결제 목록과 상세로 모델명만 채운다.
  if (response.status === 404 || response.status === 401) {
    return enrichModels(await fetchUnpaidBills(signal), signal);
  }
  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "입금 대기 내역을 불러오지 못했습니다."));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("입금 대기 내역 응답이 올바르지 않습니다.");
  }
  if (!Array.isArray(body)) {
    throw new Error("입금 대기 내역 응답이 올바르지 않습니다.");
  }
  return body.map(parseDepositBill);
}

function parseDepositBill(value: unknown): PaymentListItem {
  if (!isRecord(value)
    || !isId(value.billId)
    || typeof value.receptionNumber !== "string"
    || value.receptionNumber === ""
    || typeof value.customerName !== "string"
    || !isNullableString(value.modelName)
    || !isAmount(value.amount)
    || !isBillStatus(value.status)
    || !isNullableString(value.billedAt)) {
    throw new Error("입금 대기 내역 응답이 올바르지 않습니다.");
  }
  return {
    billId: value.billId,
    asReceptionNumber: value.receptionNumber,
    customerName: value.customerName,
    amount: value.amount,
    status: value.status,
    paymentMethod: null,
    modelName: value.modelName === "" ? null : value.modelName,
    billedAt: value.billedAt === "" ? null : value.billedAt,
  };
}

async function enrichModels(items: PaymentListItem[], signal: AbortSignal): Promise<PaymentListItem[]> {
  const names = new Map<number, string | null>();
  const pending = items.filter((item) => item.modelName === null);
  for (let index = 0; index < pending.length; index += 8) {
    const batch = pending.slice(index, index + 8);
    const loaded = await Promise.all(batch.map(async (item) => {
      try {
        const detail = await fetchPaymentDetail(item.billId, signal);
        return [item.billId, detail.reception.productName] as const;
      } catch (error: unknown) {
        if (isAbortError(error)) {
          throw error;
        }
        return [item.billId, null] as const;
      }
    }));
    for (const [billId, name] of loaded) {
      names.set(billId, name);
    }
  }
  return items.map((item) => {
    const name = names.get(item.billId);
    if (item.modelName !== null || name === undefined || name === null || name === "") {
      return item;
    }
    return { ...item, modelName: name };
  });
}

export async function fetchUnpaidBills(signal: AbortSignal): Promise<PaymentListItem[]> {
  const first = await fetchPaymentList({ keyword: "", status: "UNPAID", page: 1, size: 100 }, signal);
  const items = [...first.items];
  const lastPage = Math.min(first.totalPages, 20);
  for (let page = 2; page <= lastPage; page += 1) {
    const next = await fetchPaymentList({ keyword: "", status: "UNPAID", page, size: 100 }, signal);
    items.push(...next.items);
  }
  return items;
}

function isPaymentDetail(value: unknown): value is PaymentDetail {
  if (!isRecord(value)
    || !isId(value.billId)
    || !isReception(value.reception)
    || !isAmount(value.amount)
    || !isBillStatus(value.status)
    || !isAttemptStatus(value.paymentStatus)
    || !isPaymentMethod(value.paymentMethod)
    || !isAccount(value.virtualAccount)
    || !isPaymentHistory(value.paymentHistory)
    || !isRefundHistory(value.refundHistory)
    || typeof value.refundable !== "boolean") {
    return false;
  }
  return true;
}

function isReception(value: unknown): value is PaymentReception {
  return isRecord(value)
    && typeof value.asReceptionNumber === "string"
    && value.asReceptionNumber !== ""
    && typeof value.customerName === "string"
    && isNullableString(value.productName)
    && typeof value.symptom === "string"
    && isNullableString(value.symptomDetail);
}

function isAccount(value: unknown): value is PaymentAccount | null {
  if (value === null) {
    return true;
  }
  return isRecord(value)
    && typeof value.bankCode === "string"
    && typeof value.accountNumber === "string"
    && isNullableString(value.dueAt);
}

function isPaymentHistory(value: unknown): value is PaymentHistory | null {
  if (value === null) {
    return true;
  }
  return isRecord(value)
    && isId(value.attemptId)
    && typeof value.orderId === "string"
    && isAmount(value.amount)
    && isPaymentMethod(value.paymentMethod)
    && isNullableString(value.approvedAt);
}

function isRefundHistory(value: unknown): value is RefundHistory | null {
  if (value === null) {
    return true;
  }
  return isRecord(value)
    && isId(value.refundId)
    && (value.amount === null || isAmount(value.amount))
    && typeof value.cancelReason === "string"
    && refundStatuses.some((status) => status === value.status)
    && isNullableString(value.canceledAt);
}

function isPaymentListResult(value: unknown): value is {
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
    && typeof value.totalPages === "number"
    && Number.isFinite(value.totalPages);
}

function isBillStatus(value: unknown): value is PaymentBillStatus {
  return billStatuses.some((status) => status === value);
}

function isPaymentMethod(value: unknown): value is PaymentMethod | null {
  return value === null || paymentMethods.some((method) => method === value);
}

function isAttemptStatus(value: unknown): value is PaymentAttemptStatus | null {
  return value === null || attemptStatuses.some((status) => status === value);
}

function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.message === "string" && body.message.trim() !== "") {
      return body.message;
    }
  } catch {
    // 본문이 JSON이 아니면 상태 코드로 대체한다.
  }
  if (response.status === 401) {
    return "로그인이 필요합니다.";
  }
  if (response.status === 403) {
    return "결제 정보를 볼 권한이 없습니다.";
  }
  if (response.status === 404) {
    return "결제 정보를 찾을 수 없습니다.";
  }
  return `${fallback} (${response.status})`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
