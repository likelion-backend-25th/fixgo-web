import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { SelectBox, TextArea, TextField } from "@/components/ui/Field";
import { InfoField, Notice, Panel } from "@/components/ui/Panel";
import { won } from "@/lib/format";
import { useSessionStore } from "@/stores/useSessionStore";
import { tossBankName } from "@/lib/tossBank";
import {
  fetchPaymentDetail,
  paymentBillStatusLabel,
  payByCash,
  paymentMethodLabel,
  refundPayment,
  type PaymentDetail,
  type PaymentRefundStatus,
} from "@/lib/paymentApi";

// 새 접수번호 AS-yyMMdd-순번은 끝자리가 접수 ID다.
function receptionLink(receptionNumber: string) {
  const matched = /^AS-\d{6}-(\d+)$/.exec(receptionNumber);
  const id = matched === null ? Number.NaN : Number(matched[1]);
  if (!Number.isInteger(id) || id <= 0) {
    return receptionNumber;
  }
  return (
    <Link className="text-blue-600" to={`/as/details/${id}`}>
      {receptionNumber}
    </Link>
  );
}

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
  const canManage = useSessionStore((state) => state.user?.role !== "TECHNICIAN");
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
      <Panel title="A/S 접수 정보" className="p-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <InfoItem label="고객명" value={text(reception.customerName)} />
          <InfoItem label="접수번호" value={receptionLink(reception.asReceptionNumber)} />
          <InfoItem label="제품명" value={text(reception.productName)} />
        </div>
        <div className="mt-6">
          <InfoItem label="고장 증상" value={text(reception.symptom)} />
        </div>
      </Panel>

      <Panel
        title="결제 정보"
        className="p-6"
        action={<span className={statusTextClass(detail)}>{headlineStatus(detail)}</span>}
      >
        <InfoItem label="주문번호" value={history?.orderId ?? "-"} />
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <InfoItem label="결제 수단" value={paymentMethodLabel(history?.paymentMethod ?? detail.paymentMethod)} />
          <InfoItem label="승인 시각" value={formatDateTime(history?.approvedAt ?? null)} />
        </div>
        <div className="mt-6 space-y-6 border-t border-neutral-200 pt-6">
          <div className="flex items-center justify-between gap-4 text-sm text-[#1E293B]">
            <span>청구 금액</span>
            <span>{won(detail.amount)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-[#1E293B]">최종 결제 금액</span>
            <span className="text-[22px] font-bold text-[#005A9C]">{won(history?.amount ?? detail.amount)}</span>
          </div>
        </div>
      </Panel>

      {account !== null && (
        <Panel title="가상계좌">
          <dl className="grid gap-4 sm:grid-cols-3">
            <InfoField label="은행" value={text(tossBankName(account.bankCode))} />
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

      {canManage && canPayByCash(detail) && (
        <CashPaymentForm
          billId={detail.billId}
          amount={detail.amount}
          onDone={() => setReloadKey((current) => current + 1)}
        />
      )}

      {detail.status === "UNPAID" && detail.paymentStatus === "IN_PROGRESS" && (
        <Notice tone="error">결제 결과를 확인하고 있습니다. 확인이 끝날 때까지 다시 결제할 수 없습니다.</Notice>
      )}

      {canManage && detail.status === "UNPAID" && detail.paymentStatus !== "IN_PROGRESS" && !canPayByCash(detail) && (
        <Notice tone="error">발급된 가상계좌가 있어 현금으로 받을 수 없습니다. 가상계좌는 먼저 취소해 주세요.</Notice>
      )}

      {canManage && detail.refundable && (
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
              <span className="form-label mb-1.5 block">은행</span>
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

function headlineStatus(detail: PaymentDetail): string {
  if (detail.status === "UNPAID" && detail.paymentStatus === "IN_PROGRESS") {
    return "결제 진행 중";
  }
  return paymentBillStatusLabel(detail.status);
}

function statusTextClass(detail: PaymentDetail): string {
  if (detail.status === "UNPAID" && detail.paymentStatus === "IN_PROGRESS") {
    return "text-sm font-medium text-amber-600";
  }
  if (detail.status === "PAID") {
    return "text-sm font-medium text-green-600";
  }
  if (detail.status === "UNPAID") {
    return "text-sm font-medium text-blue-600";
  }
  return "text-sm font-medium text-red-600";
}

function InfoItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-[#64748B]">{label}</p>
      <div className="mt-1.5 break-words text-sm text-[#1E293B]">{value}</div>
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
