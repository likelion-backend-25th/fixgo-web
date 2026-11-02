import { tossClientKey } from "@/config/toss";

const SDK_SRC = "https://js.tosspayments.com/v2/standard";

let sdkReady: Promise<NonNullable<Window["TossPayments"]>> | null = null;

export type TossPayMethod = "CARD" | "VIRTUAL_ACCOUNT";

export function portalSuccessUrl(token: string): string {
  return `${window.location.origin}/portal/${encodeURIComponent(token)}/success`;
}

export function portalFailUrl(token: string): string {
  return `${window.location.origin}/portal/${encodeURIComponent(token)}/fail`;
}

export async function requestTossPayment(params: {
  method: TossPayMethod;
  amount: number;
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
}): Promise<void> {
  if (tossClientKey === "") {
    throw new Error("결제 클라이언트 키가 설정되지 않았습니다.");
  }

  const TossPayments = await loadTossPayments();
  const payment = TossPayments(tossClientKey).payment({
    customerKey: TossPayments.ANONYMOUS,
  });

  await payment.requestPayment({
    method: params.method,
    amount: {
      currency: "KRW",
      value: params.amount,
    },
    orderId: params.orderId,
    orderName: params.orderName,
    successUrl: params.successUrl,
    failUrl: params.failUrl,
  });
}

export function isPaymentCanceled(error: unknown): boolean {
  return isRecord(error) && error.code === "PAY_PROCESS_CANCELED";
}

export function paymentErrorMessage(error: unknown): string {
  if (isRecord(error) && typeof error.message === "string" && error.message.trim() !== "") {
    return error.message;
  }
  if (error instanceof Error && error.message !== "") {
    return error.message;
  }
  return "결제를 시작하지 못했습니다.";
}

function loadTossPayments(): Promise<NonNullable<Window["TossPayments"]>> {
  if (window.TossPayments !== undefined) {
    return Promise.resolve(window.TossPayments);
  }
  if (sdkReady === null) {
    sdkReady = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`);
      const script = existing ?? document.createElement("script");
      const finish = () => {
        if (window.TossPayments === undefined) {
          sdkReady = null;
          reject(new Error("토스페이먼츠 SDK를 불러오지 못했습니다."));
          return;
        }
        resolve(window.TossPayments);
      };
      script.addEventListener("load", finish, { once: true });
      script.addEventListener("error", () => {
        sdkReady = null;
        reject(new Error("토스페이먼츠 SDK를 불러오지 못했습니다."));
      }, { once: true });
      if (existing === null) {
        script.src = SDK_SRC;
        script.async = true;
        document.head.appendChild(script);
      }
    });
  }
  return sdkReady;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
