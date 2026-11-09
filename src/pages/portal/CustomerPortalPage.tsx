import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { receptionStatusLabel } from "@/lib/asReceptionApi";
import { won } from "@/lib/format";
import type { AsReceptionStatus } from "@/types/asReception";
import {
  cancelPortalPayment,
  decidePortalQuote,
  fetchPortal,
  InvalidPortalLinkError,
  startPortalPayment,
  type PaymentSummary,
  type PortalQuote,
  type PortalReception,
  type PortalResponse,
  type PortalStatusHistory,
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

const STEPS = ["접수", "점검", "견적 승인", "수리", "결제"] as const;

// 고객에게 보이는 5단계. 보증 판정은 점검, 배송·수령·완료는 결제 단계에 둔다.
function stageIndex(status: AsReceptionStatus): number {
  if (status === "RECEIVED") {
    return 0;
  }
  if (status === "INSPECTION" || status === "WARRANTY_REVIEW") {
    return 1;
  }
  if (status === "AWAITING_QUOTE_APPROVAL") {
    return 2;
  }
  if (status === "AWAITING_REPAIR" || status === "REPAIR_IN_PROGRESS") {
    return 3;
  }
  return 4;
}

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

  return (
    <PortalFrame>
      <PortalBody
        token={token}
        portal={load.portal}
        onRefresh={() => setReloadKey((current) => current + 1)}
      />
    </PortalFrame>
  );
}

function PortalBody({
  token,
  portal,
  onRefresh,
}: {
  token: string;
  portal: PortalResponse;
  onRefresh: () => void;
}) {
  const { reception, quote, payment } = portal;
  const current = stageIndex(reception.status);
  const [selected, setSelected] = useState(current);
  const [seenStatus, setSeenStatus] = useState(reception.status);
  const [receiptOpen, setReceiptOpen] = useState(false);
  if (seenStatus !== reception.status) {
    setSeenStatus(reception.status);
    setSelected(stageIndex(reception.status));
  }

  const timeline = [...reception.histories].reverse();
  const stageHistories = reception.histories.filter((item) => stageIndex(item.status) === selected).reverse();
  const showPayment = selected === 4 && payment !== null && payment.status !== "NOT_ISSUED";

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-neutral-900">A/S 진행</p>
          {reception.receptionNumber !== null && reception.receptionNumber.trim() !== "" && (
            <p className="mt-0.5 text-sm text-neutral-500">{reception.receptionNumber}</p>
          )}
        </div>
        <span className="shrink-0 rounded-md border border-blue-600 px-2 py-1 text-xs font-medium text-blue-600">
          {receptionStatusLabel(reception.status)}
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-neutral-200 px-3 py-2.5">
        <p className="text-xs text-neutral-500">서버에서 발급한 링크</p>
        <p className="mt-1 break-all text-sm font-medium text-neutral-900">fixgo/{token}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-neutral-200 px-3 py-3">
        <SummaryItem label="고객" value={reception.customerName} />
        <SummaryItem label="연락처" value={reception.customerPhone} />
        <SummaryItem label="제품" value={reception.modelName} />
        <SummaryItem label="증상" value={reception.symptom} />
      </div>

      <section className="mt-5">
        <p className="text-sm font-semibold text-neutral-900">진행</p>
        <ol className="relative mt-3 grid grid-cols-5">
          <div className="absolute top-[7px] right-[10%] left-[10%] h-px bg-neutral-300" />
          {current > 0 && (
            <div
              className="absolute top-[7px] left-[10%] h-px bg-blue-600"
              style={{ width: `${(current / (STEPS.length - 1)) * 80}%` }}
            />
          )}
          {STEPS.map((label, index) => {
            const reached = index <= current;
            const active = index === selected;
            return (
              <li key={label} className="relative">
                <button
                  type="button"
                  disabled={!reached}
                  aria-current={index === current ? "step" : undefined}
                  onClick={() => setSelected(index)}
                  className="flex w-full flex-col items-center gap-2 disabled:cursor-default"
                >
                  <span
                    className={
                      reached
                        ? `h-3.5 w-3.5 rounded-full bg-blue-600 ${active ? "ring-2 ring-blue-200 ring-offset-2" : ""}`
                        : "h-3.5 w-3.5 rounded-full bg-neutral-300"
                    }
                  />
                  <span
                    className={
                      reached
                        ? `text-center text-[11px] leading-tight ${active ? "font-semibold text-blue-600" : "text-blue-600"}`
                        : "text-center text-[11px] leading-tight text-neutral-500"
                    }
                  >
                    {label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-5">
        <p className="text-sm font-semibold text-neutral-900">{selected === current ? "지금 단계" : "이전 단계"}</p>
        <div className="mt-2 rounded-lg border border-neutral-300 px-3 py-3">
          <p className="text-sm font-semibold text-neutral-900">{STEPS[selected]}</p>
          {stageLines(selected, reception.status, quote, payment).map((line) => (
            <p key={line} className="text-sm text-neutral-700">{line}</p>
          ))}
          {selected === 0 && (
            <ReceiptDetails open={receiptOpen} reception={reception} onToggle={() => setReceiptOpen((open) => !open)} />
          )}
          {selected === 2 && quote !== null && (
            <QuoteDetails token={token} quote={quote} onRefresh={onRefresh} />
          )}
          {selected > 0 && selected < 4 && stageHistories.length > 0 && (
            <StageRecords histories={stageHistories} />
          )}
          {showPayment && payment !== null && (
            <div className="mt-3">
              <PaymentBody token={token} payment={payment} onRefresh={onRefresh} />
            </div>
          )}
        </div>
      </section>

      {timeline.length > 0 && (
        <section className="mt-5">
          <p className="text-sm font-semibold text-neutral-900">진행 이력</p>
          <ol className="mt-2">
            {timeline.map((item, index) => {
              const changedAt = formatDateTime(item.changedAt);
              return (
                <li key={`${item.status}-${item.changedAt ?? "none"}-${index}`} className="py-1.5 text-sm text-neutral-700">
                  {changedAt !== null ? `${changedAt} ${receptionStatusLabel(item.status)}` : receptionStatusLabel(item.status)}
                </li>
              );
            })}
          </ol>
        </section>
      )}
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string | null }) {
  if (value === null || value.trim() === "") {
    return null;
  }
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 text-sm font-medium break-all text-neutral-900">{value}</p>
    </div>
  );
}

function ReceiptDetails({
  open,
  reception,
  onToggle,
}: {
  open: boolean;
  reception: PortalReception;
  onToggle: () => void;
}) {
  return (
    <div>
      <Button className="mt-3 w-full" onClick={onToggle}>
        {open ? "접수증 닫기" : "접수증 보기"}
      </Button>
      {open && (
        <dl className="mt-2">
          <Field label="접수번호" value={reception.receptionNumber} />
          <Field label="접수 시각" value={formatDateTime(reception.receivedAt)} />
          <Field label="고객명" value={reception.customerName} />
          <Field label="연락처" value={reception.customerPhone} />
          <Field label="제품" value={reception.modelName} />
          <Field label="시리얼" value={reception.serialNumber} />
          <Field label="고장 증상" value={reception.symptom} />
          <Field label="증상 상세" value={reception.symptomDetail} />
        </dl>
      )}
    </div>
  );
}

function QuoteDetails({
  token,
  quote,
  onRefresh,
}: {
  token: string;
  quote: PortalQuote;
  onRefresh: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [asking, setAsking] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState("");
  const pendingRef = useRef(false);

  async function decide(decision: "approve" | "reject") {
    if (pendingRef.current) {
      return;
    }
    setAsking(null);
    pendingRef.current = true;
    setError("");
    setPending(true);
    try {
      await decidePortalQuote(token, decision);
      onRefresh();
    } catch (caught) {
      pendingRef.current = false;
      setPending(false);
      setError(caught instanceof Error ? caught.message : "견적을 처리하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <div>
      <div className="mt-3 border-t border-neutral-100 pt-2">
        <p className="text-sm font-semibold text-neutral-900">견적서</p>
        <dl>
          <Field label="진단" value={quote.diagnosis} />
          <Field label="발행 시각" value={formatDateTime(quote.issuedAt)} />
        </dl>
        <ul className="mt-1 border-t border-neutral-100">
          {quote.items.map((item, index) => (
            <li
              key={`${item.name}-${index}`}
              className="flex items-baseline justify-between gap-3 border-b border-neutral-100 py-2 text-sm"
            >
              <span className="text-neutral-900">
                {item.name}{item.quantity > 0 ? ` × ${item.quantity}` : ""}
              </span>
              <span className="shrink-0 font-medium text-neutral-900">{won(item.amount)}</span>
            </li>
          ))}
          {quote.laborCost > 0 && (
            <li className="flex items-baseline justify-between gap-3 border-b border-neutral-100 py-2 text-sm">
              <span className="text-neutral-900">공임</span>
              <span className="shrink-0 font-medium text-neutral-900">{won(quote.laborCost)}</span>
            </li>
          )}
          {quote.inspectionCost > 0 && (
            <li className="flex items-baseline justify-between gap-3 border-b border-neutral-100 py-2 text-sm">
              <span className="text-neutral-900">점검비</span>
              <span className="shrink-0 font-medium text-neutral-900">{won(quote.inspectionCost)}</span>
            </li>
          )}
        </ul>
        <div className="flex items-baseline justify-between gap-3 py-2 text-sm">
          <span className="text-neutral-500">합계</span>
          <span className="text-base font-semibold text-neutral-900">{won(quote.totalAmount)}</span>
        </div>
      </div>
      {quote.status === "PENDING" && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button disabled={pending} onClick={() => setAsking("approve")}>견적 승인</Button>
          <Button variant="outline" disabled={pending} onClick={() => setAsking("reject")}>견적 거부</Button>
        </div>
      )}
      {error !== "" && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {asking !== null && (
        <ConfirmModal
          title={asking === "approve" ? "견적 승인" : "견적 거부"}
          message={
            asking === "approve"
              ? "견적을 승인하시겠습니까?"
              : "견적을 거부하시겠습니까? 거부하면 점검비 결제로 넘어갑니다."
          }
          confirmLabel={asking === "approve" ? "승인" : "거부"}
          onConfirm={() => void decide(asking)}
          onClose={() => setAsking(null)}
        />
      )}
    </div>
  );
}

function StageRecords({ histories }: { histories: PortalStatusHistory[] }) {
  return (
    <ul className="mt-3 border-t border-neutral-100 pt-2">
      {histories.map((item, index) => {
        const changedAt = formatDateTime(item.changedAt);
        return (
          <li key={`${item.status}-${item.changedAt ?? "none"}-${index}`} className="py-1.5 text-sm text-neutral-700">
            {changedAt !== null ? `${changedAt} ${receptionStatusLabel(item.status)}` : receptionStatusLabel(item.status)}
          </li>
        );
      })}
    </ul>
  );
}

function stageLines(
  stage: number,
  status: AsReceptionStatus,
  quote: PortalQuote | null,
  payment: PaymentSummary | null,
): string[] {
  if (stage === 0) {
    return status === "RECEIVED" ? ["접수가 완료되었습니다.", "점검 전입니다."] : ["접수가 완료되었습니다."];
  }
  if (stage === 1) {
    if (status === "INSPECTION") {
      return ["점검이 진행 중입니다.", "견적 전입니다."];
    }
    if (status === "WARRANTY_REVIEW") {
      return ["보증을 확인하고 있습니다.", "견적 전입니다."];
    }
    return ["점검이 완료되었습니다."];
  }
  if (stage === 2) {
    if (quote?.status === "APPROVED") {
      return ["견적을 승인했습니다."];
    }
    if (quote?.status === "REJECTED") {
      return ["견적을 거부했습니다."];
    }
    if (status === "AWAITING_QUOTE_APPROVAL" || quote?.status === "PENDING") {
      return ["견적 승인을 기다리고 있습니다."];
    }
    return ["견적 단계가 완료되었습니다."];
  }
  if (stage === 3) {
    if (status === "AWAITING_REPAIR") {
      return ["수리를 기다리고 있습니다.", "결제 전입니다."];
    }
    if (status === "REPAIR_IN_PROGRESS") {
      return ["수리가 진행 중입니다.", "결제 전입니다."];
    }
    return ["수리가 완료되었습니다."];
  }
  if (status === "AWAITING_SHIPMENT") {
    return ["결제가 완료되었습니다.", "배송을 기다리고 있습니다."];
  }
  if (status === "AWAITING_PICKUP") {
    return ["결제가 완료되었습니다.", "수령을 기다리고 있습니다."];
  }
  if (status === "COMPLETED") {
    return ["모든 단계가 완료되었습니다."];
  }
  if (payment === null || payment.status === "NOT_ISSUED") {
    return ["결제 전입니다."];
  }
  if (payment.status === "WAITING_FOR_DEPOSIT") {
    return ["가상계좌 입금을 기다리고 있습니다."];
  }
  if (payment.status === "REFUNDED") {
    return ["환불이 완료되었습니다."];
  }
  if (payment.status === "PAID") {
    return ["결제가 완료되었습니다."];
  }
  return ["결제를 기다리고 있습니다."];
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

  if (payment.status === "PAID" || payment.status === "REFUNDED") {
    return (
      <dl>
        <Field label="금액" value={money(payment.amount)} emphasize />
        <Field label="결제 수단" value={methodLabel(payment.paymentMethod)} />
        <Field label="결제 시각" value={formatDateTime(payment.paidAt)} />
      </dl>
    );
  }

  return null;
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
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const pendingRef = useRef(false);
  const account = payment.virtualAccount ?? null;

  async function cancelAccount() {
    if (pendingRef.current) {
      return;
    }
    setAsking(false);
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
        <Field label="은행명" value={account?.bankName ?? null} />
        <Field label="계좌번호" value={account?.accountNumber ?? null} />
        <Field label="입금 기한" value={formatDateTime(account?.dueAt)} />
      </dl>
      <Button className="mt-4 w-full" variant="outline" disabled={pending} onClick={() => setAsking(true)}>
        가상계좌 취소
      </Button>
      {error !== "" && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {asking && (
        <ConfirmModal
          title="가상계좌 취소"
          message="발급된 가상계좌를 취소하시겠습니까?"
          confirmLabel="가상계좌 취소"
          cancelLabel="닫기"
          onConfirm={() => void cancelAccount()}
          onClose={() => setAsking(false)}
        />
      )}
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
        <Field label="항목명" value={payment.orderName} />
        <Field label="금액" value={money(payment.amount)} emphasize />
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

function Field({ label, value, emphasize = false }: { label: string; value: string | null; emphasize?: boolean }) {
  if (value === null || value.trim() === "") {
    return null;
  }
  return <InfoRow label={label} value={value} emphasize={emphasize} />;
}

function money(amount: number | null): string | null {
  if (amount === null) {
    return null;
  }
  return won(amount);
}

function formatDateTime(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim() === "") {
    return null;
  }
  const matched = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value);
  if (matched === null) {
    return value;
  }
  return `${matched[1]} ${matched[2]}`;
}

function methodLabel(method: PaymentSummary["paymentMethod"]): string | null {
  if (method === "CARD") {
    return "카드";
  }
  if (method === "VIRTUAL_ACCOUNT") {
    return "가상계좌";
  }
  if (method === "CASH") {
    return "현금";
  }
  return null;
}
