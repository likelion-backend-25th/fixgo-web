import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { Notice, Panel } from "@/components/ui/Panel";
import { won } from "@/lib/format";
import {
  fetchPaymentDetail,
  paymentAttemptStatusLabel,
  paymentBillStatusLabel,
  paymentMethodLabel,
  type PaymentDetail,
  type PaymentRefundStatus,
} from "@/lib/paymentApi";

type LoadState =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "error"; message: string }
  | { kind: "ready"; detail: PaymentDetail };

export function PaymentDetailPage() {
  const { billId = "" } = useParams();
  const [load, setLoad] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    if (!/^\d+$/.test(billId)) {
      setLoad({ kind: "invalid" });
      return;
    }

    const controller = new AbortController();
    setLoad({ kind: "loading" });
    fetchPaymentDetail(Number(billId), controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) {
          setLoad({ kind: "ready", detail });
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || (cause instanceof DOMException && cause.name === "AbortError")) {
          return;
        }
        const message = cause instanceof Error ? cause.message : "결제 정보를 불러오지 못했습니다.";
        if (message === "결제 정보를 찾을 수 없습니다.") {
          setLoad({ kind: "invalid" });
          return;
        }
        setLoad({ kind: "error", message });
      });

    return () => controller.abort();
  }, [billId]);

  if (load.kind === "loading") {
    return <p className="text-sm text-neutral-600">결제 정보를 불러오는 중입니다.</p>;
  }
  if (load.kind === "invalid") {
    return <Notice tone="error">결제 정보를 찾을 수 없습니다.</Notice>;
  }
  if (load.kind === "error") {
    return <Notice tone="error">{load.message}</Notice>;
  }

  const detail = load.detail;
  const reception = detail.reception;
  const account = detail.virtualAccount;
  const history = detail.paymentHistory;
  const refund = detail.refundHistory;

  return (
    <div className="space-y-4">
      <Panel title="결제 기본 정보">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p>청구번호 {detail.billId}</p>
          <p>
            접수번호{" "}
            <Link className="text-blue-600" to={`/as/details/${reception.asReceptionNumber}`}>
              {reception.asReceptionNumber}
            </Link>
          </p>
          <p>고객명 {text(reception.customerName)}</p>
          <p>제품명 {text(reception.productName)}</p>
          <p>고장 증상 {text(reception.symptom)}</p>
          <p>증상 상세 {text(reception.symptomDetail)}</p>
          <p>청구 금액 {won(detail.amount)}</p>
          <p>상태 {paymentBillStatusLabel(detail.status)}</p>
          <p>결제 진행 {paymentAttemptStatusLabel(detail.paymentStatus)}</p>
          <p>결제 수단 {paymentMethodLabel(detail.paymentMethod)}</p>
        </div>
      </Panel>
      {(account !== null || history !== null || refund !== null) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {account !== null && (
            <Panel title="가상 계좌">
              <p className="text-sm">은행 {text(account.bankCode)}</p>
              <p className="mt-1 text-sm">계좌번호 {text(account.accountNumber)}</p>
              <p className="mt-1 text-sm">입금 기한 {formatDateTime(account.dueAt)}</p>
            </Panel>
          )}
          {history !== null && (
            <Panel title="결제 이력">
              <p className="text-sm">주문번호 {history.orderId}</p>
              <p className="text-sm">결제 금액 {won(history.amount)}</p>
              <p className="text-sm">결제 수단 {paymentMethodLabel(history.paymentMethod)}</p>
              <p className="text-sm">승인 시각 {formatDateTime(history.approvedAt)}</p>
              <p className="mt-2 text-sm">{detail.refundable ? "환불 가능" : "환불 불가"}</p>
            </Panel>
          )}
          {refund !== null && (
            <Panel title="환불 이력">
              <p className="text-sm">환불 금액 {refund.amount === null ? "-" : won(refund.amount)}</p>
              <p className="text-sm">환불 사유 {text(refund.cancelReason)}</p>
              <p className="text-sm">환불 상태 {refundStatusLabel(refund.status)}</p>
              <p className="text-sm">환불 시각 {formatDateTime(refund.canceledAt)}</p>
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}

function refundStatusLabel(status: PaymentRefundStatus): string {
  if (status === "IN_PROGRESS") {
    return "환불 진행";
  }
  if (status === "DONE") {
    return "환불 완료";
  }
  return "환불 실패";
}

function text(value: string | null): string {
  if (value === null || value.trim() === "") {
    return "-";
  }
  return value;
}

function formatDateTime(value: string | null): string {
  if (value === null || value.trim() === "") {
    return "-";
  }
  const matched = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(value);
  if (matched === null) {
    return value;
  }
  return `${matched[1]} ${matched[2]}`;
}
