export type PaymentSummaryStatus = "NOT_ISSUED" | "UNPAID" | "WAITING_FOR_DEPOSIT" | "PAID";

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

export interface PortalResponse {
  payment: PaymentSummary;
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

const statuses: readonly PaymentSummaryStatus[] = ["NOT_ISSUED", "UNPAID", "WAITING_FOR_DEPOSIT", "PAID"];

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

  if (!isPortalResponse(body)) {
    throw new Error("포털 정보를 불러오지 못했습니다.");
  }
  return body;
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

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("결제 승인에 실패했습니다. 다시 시도해 주세요.");
  }
  if (!isRecord(body)) {
    throw new Error("결제 승인에 실패했습니다. 다시 시도해 주세요.");
  }
}

function isPortalResponse(value: unknown): value is PortalResponse {
  if (!isRecord(value)) {
    return false;
  }
  const payment = value.payment;
  if (!isRecord(payment)) {
    return false;
  }
  return statuses.some((status) => status === payment.status);
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
