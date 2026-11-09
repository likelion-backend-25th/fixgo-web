import { AS_RECEPTION_STATUSES, type AsReceptionStatus } from "@/types/asReception";

export type PaymentSummaryStatus = "NOT_ISSUED" | "UNPAID" | "WAITING_FOR_DEPOSIT" | "PAID" | "REFUNDED";

export interface VirtualAccountInfo {
  bankName: string | null;
  accountNumber: string | null;
  dueAt: string | null;
}

export interface PaymentSummary {
  status: PaymentSummaryStatus;
  orderName: string | null;
  amount: number | null;
  paymentMethod: "CARD" | "VIRTUAL_ACCOUNT" | "CASH" | null;
  paidAt: string | null;
  virtualAccount?: VirtualAccountInfo | null;
}

export interface PortalStatusHistory {
  status: AsReceptionStatus;
  changedAt: string | null;
}

export interface PortalReception {
  receptionNumber: string | null;
  receivedAt: string | null;
  customerName: string | null;
  customerPhone: string | null;
  modelName: string | null;
  serialNumber: string | null;
  symptom: string | null;
  symptomDetail: string | null;
  status: AsReceptionStatus;
  histories: PortalStatusHistory[];
}

export type QuoteStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface QuoteItem {
  name: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PortalQuote {
  status: QuoteStatus;
  diagnosis: string | null;
  items: QuoteItem[];
  laborCost: number;
  inspectionCost: number;
  totalAmount: number;
  issuedAt: string | null;
}

export interface PortalResponse {
  reception: PortalReception;
  quote: PortalQuote | null;
  payment: PaymentSummary | null;
}

export interface StartPaymentResponse {
  orderId: string;
  amount: number;
  orderName: string;
}

export interface ConfirmPaymentRequest {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export class InvalidPortalLinkError extends Error {
  constructor() {
    super("링크가 유효하지 않습니다");
    this.name = "InvalidPortalLinkError";
  }
}

const statuses: readonly PaymentSummaryStatus[] = ["NOT_ISSUED", "UNPAID", "WAITING_FOR_DEPOSIT", "PAID", "REFUNDED"];

export async function fetchPortal(token: string, signal: AbortSignal): Promise<PortalResponse> {
  if (token === "") {
    throw new InvalidPortalLinkError();
  }

  let response: Response;
  try {
    response = await fetch(`/api/v1/portal/${encodeURIComponent(token)}`, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error("포털 정보를 불러오지 못했습니다.");
  }

  if (response.status === 502 || response.status === 503 || response.status === 504) {
    throw new Error("포털 정보를 불러오지 못했습니다.");
  }
  if (!response.ok) {
    throw new InvalidPortalLinkError();
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("포털 정보를 불러오지 못했습니다.");
  }

  const portal = parsePortal(body);
  if (portal === null) {
    throw new Error("포털 정보를 불러오지 못했습니다.");
  }
  return portal;
}

export async function startPortalPayment(token: string): Promise<StartPaymentResponse> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/portal/${encodeURIComponent(token)}/payments/start`, {
      method: "POST",
      redirect: "manual",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error("결제를 시작하지 못했습니다.");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "결제를 시작하지 못했습니다."));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("결제 시작 응답이 올바르지 않습니다.");
  }

  if (!isStartPaymentResponse(body)) {
    throw new Error("결제 시작 응답이 올바르지 않습니다.");
  }
  return body;
}

export async function decidePortalQuote(token: string, decision: "approve" | "reject"): Promise<void> {
  const fallback = decision === "approve"
    ? "견적을 승인하지 못했습니다. 다시 시도해 주세요."
    : "견적을 거부하지 못했습니다. 다시 시도해 주세요.";
  let response: Response;
  try {
    response = await fetch(`/api/v1/portal/${encodeURIComponent(token)}/quote/${decision}`, {
      method: "POST",
      redirect: "manual",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error(fallback);
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, fallback));
  }

  // 성공 응답은 204 No Content라 본문이 없다.
}

export async function cancelPortalPayment(token: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`/api/v1/portal/${encodeURIComponent(token)}/payments/cancel`, {
      method: "POST",
      redirect: "manual",
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new Error("가상계좌를 취소하지 못했습니다. 다시 시도해 주세요.");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "가상계좌를 취소하지 못했습니다. 다시 시도해 주세요."));
  }

  // 성공 응답은 204 No Content라 본문이 없다.
}

const confirmInflight = new Map<string, Promise<void>>();

export function confirmPaymentOnce(request: ConfirmPaymentRequest): Promise<void> {
  const key = `${request.orderId}\n${request.paymentKey}\n${request.amount}`;
  const current = confirmInflight.get(key);
  if (current !== undefined) {
    return current;
  }

  const pending = postConfirm(request).finally(() => {
    confirmInflight.delete(key);
  });
  confirmInflight.set(key, pending);
  return pending;
}

export function parseAmountParam(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) {
    return null;
  }
  const amount = Number(raw);
  if (!Number.isSafeInteger(amount)) {
    return null;
  }
  return amount;
}

async function postConfirm(request: ConfirmPaymentRequest): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/v1/payments/confirm", {
      method: "POST",
      redirect: "manual",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: request.paymentKey,
        orderId: request.orderId,
        amount: request.amount,
      }),
    });
  } catch {
    throw new Error("결제 승인에 실패했습니다. 다시 시도해 주세요.");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "결제 승인에 실패했습니다. 다시 시도해 주세요."));
  }

  // 성공 응답은 204 No Content라 본문이 없다.
}

function parsePortal(value: unknown): PortalResponse | null {
  if (!isRecord(value)) {
    return null;
  }
  const reception = parseReception(value.reception);
  if (reception === null) {
    return null;
  }
  // 아직 도달하지 않은 견적·결제는 null이다. 형식이 달라도 접수 내역은 남긴다.
  return {
    reception,
    quote: parseQuote(value.quote),
    payment: parsePayment(value.payment),
  };
}

const quoteStatuses: readonly QuoteStatus[] = ["PENDING", "APPROVED", "REJECTED"];

function parseQuote(value: unknown): PortalQuote | null {
  if (!isRecord(value) || !isQuoteStatus(value.status)) {
    return null;
  }
  const laborCost = readAmount(value.laborCost);
  const inspectionCost = readAmount(value.inspectionCost);
  const totalAmount = readAmount(value.totalAmount);
  if (laborCost === null || inspectionCost === null || totalAmount === null) {
    return null;
  }
  return {
    status: value.status,
    diagnosis: readNullableString(value.diagnosis),
    items: parseQuoteItems(value.items),
    laborCost,
    inspectionCost,
    totalAmount,
    issuedAt: readNullableString(value.issuedAt),
  };
}

function parseQuoteItems(value: unknown): QuoteItem[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const items: QuoteItem[] = [];
  for (const item of value) {
    if (!isRecord(item) || typeof item.name !== "string" || item.name.trim() === "") {
      continue;
    }
    const quantity = readAmount(item.quantity);
    const unitPrice = readAmount(item.unitPrice);
    const amount = readAmount(item.amount);
    if (quantity === null || unitPrice === null || amount === null) {
      continue;
    }
    items.push({ name: item.name, quantity, unitPrice, amount });
  }
  return items;
}

function readAmount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isQuoteStatus(value: unknown): value is QuoteStatus {
  return typeof value === "string" && (quoteStatuses as readonly string[]).includes(value);
}

function parseReception(value: unknown): PortalReception | null {
  if (!isRecord(value) || !isReceptionStatus(value.status)) {
    return null;
  }
  return {
    receptionNumber: readNullableString(value.receptionNumber),
    receivedAt: readNullableString(value.receivedAt),
    customerName: readNullableString(value.customerName),
    customerPhone: readNullableString(value.customerPhone),
    modelName: readNullableString(value.modelName),
    serialNumber: readNullableString(value.serialNumber),
    symptom: readNullableString(value.symptom),
    symptomDetail: readNullableString(value.symptomDetail),
    status: value.status,
    histories: parseHistories(value.histories),
  };
}

function parseHistories(value: unknown): PortalStatusHistory[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const histories: PortalStatusHistory[] = [];
  for (const item of value) {
    if (!isRecord(item) || !isReceptionStatus(item.status)) {
      continue;
    }
    histories.push({
      status: item.status,
      changedAt: readNullableString(item.changedAt),
    });
  }
  return histories;
}

function parsePayment(value: unknown): PaymentSummary | null {
  if (!isRecord(value) || !isPaymentStatus(value.status)) {
    return null;
  }
  return {
    status: value.status,
    orderName: readNullableString(value.orderName),
    amount: typeof value.amount === "number" && Number.isFinite(value.amount) ? value.amount : null,
    paymentMethod: readPaymentMethod(value.paymentMethod),
    paidAt: readNullableString(value.paidAt),
    virtualAccount: parseVirtualAccount(value.virtualAccount),
  };
}

function parseVirtualAccount(value: unknown): VirtualAccountInfo | null {
  if (!isRecord(value)) {
    return null;
  }
  return {
    bankName: readNullableString(value.bankName),
    accountNumber: readNullableString(value.accountNumber),
    dueAt: readNullableString(value.dueAt),
  };
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readPaymentMethod(value: unknown): PaymentSummary["paymentMethod"] {
  if (value === "CARD" || value === "VIRTUAL_ACCOUNT" || value === "CASH") {
    return value;
  }
  return null;
}

function isReceptionStatus(value: unknown): value is AsReceptionStatus {
  return typeof value === "string" && (AS_RECEPTION_STATUSES as readonly string[]).includes(value);
}

function isPaymentStatus(value: unknown): value is PaymentSummaryStatus {
  return typeof value === "string" && (statuses as readonly string[]).includes(value);
}

function isStartPaymentResponse(value: unknown): value is StartPaymentResponse {
  return isRecord(value)
    && typeof value.orderId === "string"
    && value.orderId !== ""
    && typeof value.orderName === "string"
    && typeof value.amount === "number"
    && Number.isFinite(value.amount);
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.message === "string" && body.message.trim() !== "") {
      return body.message;
    }
  } catch {
    // 본문이 JSON이 아니면 기본 문구를 쓴다.
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
