import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { won } from "@/lib/format";
import {
  cancelPortalPayment,
  fetchPortal,
  InvalidPortalLinkError,
  startPortalPayment,
  type PaymentSummary,
  type PaymentSummaryStatus,
  type PortalResponse,
} from "@/lib/portalApi";
import {
  isPaymentCanceled,
  paymentErrorMessage,
  portalFailUrl,
  portalSuccessUrl,
  requestTossPayment,
  type TossPayMethod,
} from "@/lib/tossPayments";
import { InfoRow, PortalFrame } from "@/pages/portal/PortalFrame";

type LoadState =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "error"; message: string }
  | { kind: "ready"; portal: PortalResponse };

const statusLabel: Record<PaymentSummaryStatus, string> = {
  NOT_ISSUED: "청구 전",
  UNPAID: "결제 대기",
  WAITING_FOR_DEPOSIT: "입금 대기",
  PAID: "결제 완료",
};

export function CustomerPortalPage() {
  const { token = "" } = useParams();
  const [reloadKey, setReloadKey] = useState(0);
  const [requestKey, setRequestKey] = useState(`${token}:${reloadKey}`);
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });
  const nextRequestKey = `${token}:${reloadKey}`;
  if (requestKey !== nextRequestKey) {
    setRequestKey(nextRequestKey);
    setLoad({ kind: "loading" });
  }

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    fetchPortal(token, controller.signal)
      .then((portal) => {
        if (active) {
          setLoad({ kind: "ready", portal });
        }
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted) {
          return;
        }
        if (error instanceof InvalidPortalLinkError) {
          setLoad({ kind: "invalid" });
          return;
        }
        setLoad({
          kind: "error",
          message: error instanceof Error ? error.message : "포털 정보를 불러오지 못했습니다.",
        });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [token, reloadKey]);

  if (load.kind === "loading") {
    return (
      <PortalFrame>
        <p className="text-center text-sm text-neutral-600">안내 내용을 불러오는 중입니다.</p>
      </PortalFrame>
    );
  }

  if (load.kind === "invalid") {
    return (
      <PortalFrame>
        <p className="text-center text-sm text-neutral-600">링크가 유효하지 않습니다</p>
      </PortalFrame>
    );
  }

  if (load.kind === "error") {
    return (
      <PortalFrame>
        <p className="text-center text-sm text-neutral-600">{load.message}</p>
        <Button className="mt-4 w-full" variant="outline" onClick={() => setReloadKey((current) => current + 1)}>
          다시 불러오기
        </Button>
      </PortalFrame>
    );
  }

  const payment = load.portal.payment;

  if (payment.status === "NOT_ISSUED") {
    return (
      <PortalFrame>
        <p className="text-center text-sm text-neutral-600">아직 청구 내역이 없습니다</p>
      </PortalFrame>
    );
  }

  return (
    <PortalFrame>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-neutral-900">{payment.status === "WAITING_FOR_DEPOSIT" ? "입금 안내" : "결제"}</p>
        <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">{statusLabel[payment.status]}</span>
      </div>
      <PaymentBody
        token={token}
        payment={payment}
        onRefresh={() => setReloadKey((current) => current + 1)}
      />
    </PortalFrame>
  );
}

function PaymentBody({
  token,
  payment,
  onRefresh,
}: {
  token: string;
  payment: PaymentSummary;
  onRefresh: () => void;
}) {
  if (payment.status === "UNPAID") {
    return <UnpaidPayment token={token} payment={payment} />;
  }

  if (payment.status === "WAITING_FOR_DEPOSIT") {
    return <WaitingDeposit token={token} payment={payment} onRefresh={onRefresh} />;
  }

  if (payment.status !== "PAID") {
    return null;
  }

  return (
    <section>
      <p className="text-sm text-neutral-700">결제가 완료되었습니다.</p>
      <dl className="mt-2">
        <InfoRow label="금액" value={money(payment.amount)} emphasize />
        <InfoRow label="결제 수단" value={methodLabel(payment.paymentMethod)} />
        <InfoRow label="결제 시각" value={formatDateTime(payment.paidAt)} />
      </dl>
    </section>
  );
}

function WaitingDeposit({
  token,
  payment,
  onRefresh,
}: {
  token: string;
  payment: PaymentSummary;
  onRefresh: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const pendingRef = useRef(false);
  const account = payment.virtualAccount ?? null;

  async function cancelAccount() {
    if (pendingRef.current) {
      return;
    }
    if (!window.confirm("발급된 가상계좌를 취소하시겠습니까?")) {
      return;
    }
    pendingRef.current = true;
    setError("");
    setPending(true);
    try {
      await cancelPortalPayment(token);
      onRefresh();
    } catch (caught) {
      pendingRef.current = false;
      setPending(false);
      setError(caught instanceof Error ? caught.message : "가상계좌를 취소하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <section>
      <dl>
        <InfoRow label="은행명" value={text(account?.bankName)} />
        <InfoRow label="계좌번호" value={text(account?.accountNumber)} />
        <InfoRow label="입금 기한" value={formatDateTime(account?.dueAt)} />
      </dl>
      <Button className="mt-4 w-full" variant="outline" disabled={pending} onClick={() => void cancelAccount()}>
        가상계좌 취소
      </Button>
      {error !== "" && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}

function UnpaidPayment({ token, payment }: { token: string; payment: PaymentSummary }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function pay(method: TossPayMethod) {
    setError("");
    setPending(true);
    try {
      const started = await startPortalPayment(token);
      await requestTossPayment({
        method,
        amount: started.amount,
        orderId: started.orderId,
        orderName: started.orderName,
        successUrl: portalSuccessUrl(token),
        failUrl: portalFailUrl(token),
      });
    } catch (caught) {
      if (!isPaymentCanceled(caught)) {
        setError(paymentErrorMessage(caught));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      <dl>
        <InfoRow label="항목명" value={text(payment.orderName)} />
        <InfoRow label="금액" value={money(payment.amount)} emphasize />
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button className="h-11" disabled={pending} onClick={() => void pay("CARD")}>
          카드/간편결제
        </Button>
        <Button className="h-11" variant="outline" disabled={pending} onClick={() => void pay("VIRTUAL_ACCOUNT")}>
          가상계좌
        </Button>
      </div>
      {pending && <p className="mt-3 text-center text-xs text-neutral-500">결제창을 준비하고 있습니다.</p>}
      {error !== "" && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}

function money(amount: number | null): string {
  if (amount === null) {
    return "—";
  }
  return won(amount);
}

function text(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === "") {
    return "—";
  }
  return value;
}

function formatDateTime(value: string | null | undefined): string {
  if (value === null || value === undefined || value.trim() === "") {
    return "—";
  }
  const matched = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value);
  if (matched === null) {
    return value;
  }
  return `${matched[1]} ${matched[2]}`;
}

function methodLabel(method: PaymentSummary["paymentMethod"]): string {
  if (method === "CARD") {
    return "카드";
  }
  if (method === "VIRTUAL_ACCOUNT") {
    return "가상계좌";
  }
  if (method === "CASH") {
    return "현금";
  }
  return "—";
}
