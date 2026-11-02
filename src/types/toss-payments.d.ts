interface TossPaymentRequest {
  method: "CARD" | "VIRTUAL_ACCOUNT";
  amount: {
    currency: "KRW";
    value: number;
  };
  orderId: string;
  orderName: string;
  successUrl: string;
  failUrl: string;
}

interface TossPayment {
  requestPayment(request: TossPaymentRequest): Promise<void>;
}

interface TossPaymentsInstance {
  payment(options: { customerKey: string }): TossPayment;
}

interface TossPaymentsConstructor {
  (clientKey: string): TossPaymentsInstance;
  ANONYMOUS: string;
}

interface ImportMetaEnv {
  readonly VITE_TOSS_CLIENT_KEY?: string;
}

interface Window {
  TossPayments?: TossPaymentsConstructor;
}
