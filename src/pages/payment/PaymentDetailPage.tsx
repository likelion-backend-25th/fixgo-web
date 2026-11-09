import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SelectBox, TextArea, TextField } from "@/components/ui/Field";
import { InfoField, Notice, Panel } from "@/components/ui/Panel";
import { won } from "@/lib/format";
import {
  fetchPaymentDetail,
  paymentAttemptStatusLabel,
  paymentBillStatusLabel,
  payByCash,
  paymentMethodLabel,
  refundPayment,
  type PaymentBillStatus,
  type PaymentDetail,
  type PaymentRefundStatus,
} from "@/lib/paymentApi";

type LoadState =
  | { kind: "loading" }
  | { kind: "invalid" }
  | { kind: "error"; message: string }
  | { kind: "ready"; detail: PaymentDetail };

const bankOptions = [
  { value: "", label: "은행 선택" },
  { value: "06", label: "KB국민은행" },
  { value: "88", label: "신한은행" },
  { value: "20", label: "우리은행" },
  { value: "81", label: "하나은행" },
  { value: "11", label: "NH농협은행" },
  { value: "03", label: "IBK기업은행" },
  { value: "90", label: "카카오뱅크" },
  { value: "89", label: "케이뱅크" },
  { value: "92", label: "토스뱅크" },
  { value: "31", label: "iM뱅크(대구)" },
  { value: "32", label: "부산은행" },
  { value: "39", label: "경남은행" },
  { value: "34", label: "광주은행" },
  { value: "37", label: "전북은행" },
  { value: "35", label: "제주은행" },
  { value: "71", label: "우체국" },
  { value: "23", label: "SC제일은행" },
  { value: "07", label: "Sh수협은행" },
  { value: "45", label: "새마을금고" },
  { value: "48", label: "신협" },
];

export function PaymentDetailPage() {
  const { billId = "" } = useParams();
  const [reloadKey, setReloadKey] = useState(0);
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
        if (message === "결제 정보를 찾을 수 없습니다." || message === "결제 데이터가 없습니다.") {
          setLoad({ kind: "invalid" });
          return;
        }
        setLoad({ kind: "error", message });
      });

    return () => controller.abort();
  }, [billId, reloadKey]);

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
      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-neutral-500">청구 금액</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{won(detail.amount)}</p>
            <p className="mt-1 text-sm text-neutral-500">청구번호 {detail.billId}</p>
          </div>
          <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${statusClass(detail.status)}`}>
            {paymentBillStatusLabel(detail.status)}
          </span>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <InfoField label="결제 수단" value={paymentMethodLabel(detail.paymentMethod)} />
          <InfoField label="결제 진행" value={paymentAttemptStatusLabel(detail.paymentStatus)} />
          <InfoField label="승인 시각" value={formatDateTime(history?.approvedAt ?? null)} />
        </dl>
      </section>

      <Panel title="접수">
        <dl className="grid gap-4 sm:grid-cols-2">
          <InfoField
            label="접수번호"
            value={
              <Link className="text-blue-600" to={`/as/details/${reception.asReceptionNumber}`}>
                {reception.asReceptionNumber}
              </Link>
            }
          />
          <InfoField label="고객명" value={text(reception.customerName)} />
          <InfoField label="제품명" value={text(reception.productName)} />
          <InfoField label="고장 증상" value={text(reception.symptom)} />
          <div className="sm:col-span-2">
            <InfoField label="증상 상세" value={text(reception.symptomDetail)} />
          </div>
        </dl>
      </Panel>

      {history !== null && (
        <Panel title="결제">
          <dl className="grid gap-4 sm:grid-cols-2">
            <InfoField label="주문번호" value={history.orderId} />
            <InfoField label="결제 금액" value={won(history.amount)} />
            <InfoField label="결제 수단" value={paymentMethodLabel(history.paymentMethod)} />
            <InfoField label="승인 시각" value={formatDateTime(history.approvedAt)} />
          </dl>
        </Panel>
      )}

      {account !== null && (
        <Panel title="가상계좌">
          <dl className="grid gap-4 sm:grid-cols-3">
            <InfoField label="은행" value={text(account.bankCode)} />
            <InfoField label="계좌번호" value={text(account.accountNumber)} />
            <InfoField label="입금 기한" value={formatDateTime(account.dueAt)} />
          </dl>
        </Panel>
      )}

      {refund !== null && (
        <Panel title="환불">
          <dl className="grid gap-4 sm:grid-cols-2">
            <InfoField label="환불 금액" value={refund.amount === null ? "-" : won(refund.amount)} />
            <InfoField label="환불 상태" value={refundStatusLabel(refund.status)} />
            <InfoField label="환불 사유" value={text(refund.cancelReason)} />
            <InfoField label="환불 시각" value={formatDateTime(refund.canceledAt)} />
          </dl>
        </Panel>
      )}

      {canPayByCash(detail) && (
        <CashPaymentForm
          billId={detail.billId}
          amount={detail.amount}
          onDone={() => setReloadKey((current) => current + 1)}
        />
      )}

      {detail.status === "UNPAID" && !canPayByCash(detail) && (
        <Notice>
          진행 중인 결제나 발급된 가상계좌가 있어 현금으로 받을 수 없습니다. 가상계좌는 먼저 취소해 주세요.
        </Notice>
      )}

      {detail.refundable && (
        <RefundForm
          billId={detail.billId}
          method={detail.paymentMethod}
          onDone={() => setReloadKey((current) => current + 1)}
        />
      )}
    </div>
  );
}

// 백엔드는 미결제이고 진행 중·입금 대기·완료 시도가 없을 때만 현금 결제를 받는다. 금액은 청구서 금액이다.
function canPayByCash(detail: PaymentDetail): boolean {
  if (detail.status !== "UNPAID" || detail.virtualAccount !== null) {
    return false;
  }
  const status = detail.paymentStatus;
  return status !== "IN_PROGRESS" && status !== "WAITING_FOR_DEPOSIT" && status !== "DONE";
}

function CashPaymentForm({
  billId,
  amount,
  onDone,
}: {
  billId: number;
  amount: number;
  onDone: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const pendingRef = useRef(false);

  async function submit() {
    if (pendingRef.current) {
      return;
    }
    setAsking(false);
    setError("");
    pendingRef.current = true;
    setPending(true);
    try {
      await payByCash(billId);
      onDone();
    } catch (caught) {
      pendingRef.current = false;
      setPending(false);
      setError(caught instanceof Error ? caught.message : "현금 결제하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <Panel title="현금 결제">
      <p className="text-sm text-neutral-600">현장에서 받은 현금을 청구 금액 그대로 결제 처리합니다.</p>
      <dl className="mt-4">
        <InfoField label="결제 금액" value={won(amount)} />
      </dl>
      {error !== "" && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <Button className="mt-4" disabled={pending} onClick={() => setAsking(true)}>
        현금 결제
      </Button>
      {asking && (
        <ConfirmModal
          title="현금 결제"
          message={`청구 금액 ${won(amount)}을 현금으로 결제 처리하시겠습니까?`}
          confirmLabel="현금 결제"
          onConfirm={() => void submit()}
          onClose={() => setAsking(false)}
        />
      )}
    </Panel>
  );
}

function RefundForm({
  billId,
  method,
  onDone,
}: {
  billId: number;
  method: PaymentDetail["paymentMethod"];
  onDone: () => void;
}) {
  const needsAccount = method === "VIRTUAL_ACCOUNT";
  const [reason, setReason] = useState("");
  const [bank, setBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [pending, setPending] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState("");
  const pendingRef = useRef(false);

  function ask() {
    if (pendingRef.current) {
      return;
    }
    const cancelReason = reason.trim();
    if (cancelReason === "") {
      setError("환불 사유를 입력해 주세요.");
      return;
    }
    if (needsAccount && (bank === "" || accountNumber.trim() === "" || holderName.trim() === "")) {
      setError("가상계좌 환불은 은행, 계좌번호, 예금주가 필요합니다.");
      return;
    }
    setError("");
    setAsking(true);
  }

  async function submit() {
    if (pendingRef.current) {
      return;
    }
    const cancelReason = reason.trim();
    setAsking(false);
    pendingRef.current = true;
    setPending(true);
    try {
      await refundPayment(
        billId,
        cancelReason,
        needsAccount
          ? { bank, accountNumber: accountNumber.trim(), holderName: holderName.trim() }
          : null,
      );
      onDone();
    } catch (caught) {
      pendingRef.current = false;
      setPending(false);
      setError(caught instanceof Error ? caught.message : "환불하지 못했습니다. 다시 시도해 주세요.");
    }
  }

  return (
    <Panel title="환불">
      <p className="text-sm text-neutral-600">
        {needsAccount ? "가상계좌로 받은 결제입니다. 환불받을 계좌를 입력해 주세요." : "결제 완료된 금액을 전액 환불합니다."}
      </p>
      <div className="mt-4 grid gap-3">
        <TextArea label="환불 사유" value={reason} onChange={setReason} rows={3} placeholder="환불 사유" />
        {needsAccount && (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="mb-1.5 block text-xs font-medium text-neutral-600">은행</span>
              <SelectBox className="w-full" value={bank} onChange={setBank} options={bankOptions} />
            </label>
            <TextField label="계좌번호" value={accountNumber} onChange={setAccountNumber} placeholder="숫자만 입력" />
            <TextField label="예금주" value={holderName} onChange={setHolderName} />
          </div>
        )}
      </div>
      {error !== "" && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <Button className="mt-4" disabled={pending} onClick={ask}>
        환불
      </Button>
      {asking && (
        <ConfirmModal
          title="환불"
          message="이 결제를 환불하시겠습니까?"
          confirmLabel="환불"
          onConfirm={() => void submit()}
          onClose={() => setAsking(false)}
        />
      )}
    </Panel>
  );
}

function statusClass(status: PaymentBillStatus): string {
  if (status === "PAID") {
    return "bg-green-50 text-green-600";
  }
  if (status === "UNPAID") {
    return "bg-blue-50 text-blue-600";
  }
  return "bg-red-50 text-red-600";
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
