import { useState } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { TextArea, TextField } from "@/components/ui/Field";
import { Notice, Panel } from "@/components/ui/Panel";
import { won } from "@/lib/format";
import { payments } from "@/mocks/screenData";

export function PaymentDetailPage() {
  const { orderId } = useParams();
  const payment = payments.find((row) => row.orderId === orderId);
  const [status, setStatus] = useState(payment?.status ?? "결제 대기");
  const [method, setMethod] = useState<"카드" | "현금">("카드");
  const [paidAmount, setPaidAmount] = useState(String(payment?.amount ?? 0));
  const [refunded, setRefunded] = useState(0);
  const [refundAmount, setRefundAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  if (payment === undefined) {
    return <Notice tone="error">결제 정보를 찾을 수 없습니다.</Notice>;
  }

  const remaining = payment.amount - refunded;

  return (
    <div className="space-y-4">
      {notice !== "" && <Notice>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <Panel title="결제 기본 정보">
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <p>청구번호 {payment.orderId}</p>
          <p>접수번호 <Link className="text-blue-600" to={`/as/details/${payment.asId}`}>{payment.asId}</Link></p>
          <p>고객명 {payment.customerName}</p>
          <p>제품명 {payment.productName}</p>
          <p>고장 증상 {payment.symptom}</p>
          <p>청구 금액 {won(payment.amount)}</p>
          <p>상태 {status}</p>
          <p>결제 수단 {status === "결제 완료" ? method : payment.method}</p>
        </div>
      </Panel>
      {status === "결제 대기" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="가상 계좌">
            <p className="text-sm">계좌번호 {payment.virtualAccount ?? "발급 전"}</p>
            <p className="mt-1 text-sm">입금 기한 {payment.dueAt ?? "-"}</p>
            <Button className="mt-4 border border-black" variant="ghost" onClick={() => setNotice("가상계좌를 취소했습니다.")}>가상계좌 취소</Button>
          </Panel>
          <Panel title="현장 결제">
            <div className="mb-3 flex gap-4 text-sm">
              {(["카드", "현금"] as const).map((item) => (
                <label key={item} className="flex items-center gap-2">
                  <input type="radio" checked={method === item} onChange={() => setMethod(item)} />
                  {item}
                </label>
              ))}
            </div>
            <TextField label="결제 금액" value={paidAmount} onChange={setPaidAmount} />
            <Button
              className="mt-4"
              onClick={() => {
                if (Number(paidAmount) !== payment.amount) {
                  setError("결제 금액이 청구 금액과 다릅니다.");
                  return;
                }
                setError("");
                setStatus("결제 완료");
                setNotice("현장 결제를 등록하고 결제 완료로 변경했습니다.");
              }}
            >
              현장 결제 등록
            </Button>
          </Panel>
        </div>
      ) : (
        <PaidPanel
          remaining={remaining}
          refunded={refunded}
          refundAmount={refundAmount}
          reason={reason}
          paidAt={payment.paidAt ?? "2026-10-30"}
          method={status === "결제 완료" ? method : payment.method}
          cardNumber={payment.cardNumber ?? "-"}
          onRefundAmount={setRefundAmount}
          onReason={setReason}
          onFull={() => {
            if (reason.trim() === "") {
              setError("환불 사유를 입력해 주세요.");
              return;
            }
            setRefunded(payment.amount);
            setError("");
            setNotice("전액 환불을 요청했습니다.");
          }}
          onPartial={() => {
            const amount = Number(refundAmount);
            if (reason.trim() === "" || Number.isNaN(amount) || amount <= 0) {
              setError("환불 금액과 사유를 입력해 주세요.");
              return;
            }
            if (amount > remaining) {
              setError("부분 환불 금액은 잔여 환불 가능 금액을 초과할 수 없습니다.");
              return;
            }
            setRefunded((current) => current + amount);
            setRefundAmount("");
            setError("");
            setNotice("부분 환불을 요청했습니다.");
          }}
        />
      )}
    </div>
  );
}

function PaidPanel({
  remaining,
  refunded,
  refundAmount,
  reason,
  paidAt,
  method,
  cardNumber,
  onRefundAmount,
  onReason,
  onFull,
  onPartial,
}: {
  remaining: number;
  refunded: number;
  refundAmount: string;
  reason: string;
  paidAt: string;
  method: string;
  cardNumber: string;
  onRefundAmount: (value: string) => void;
  onReason: (value: string) => void;
  onFull: () => void;
  onPartial: () => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="결제 이력">
        <p className="text-sm">결제일 {paidAt}</p>
        <p className="text-sm">결제 수단 {method}</p>
        <p className="text-sm">카드번호 {cardNumber}</p>
        <p className="mt-2 text-sm">환불 완료 {won(refunded)} · 환불 가능 {won(remaining)}</p>
      </Panel>
      <Panel title="환불">
        <TextArea label="환불 사유" value={reason} onChange={onReason} rows={3} />
        <div className="mt-3 flex justify-end">
          <Button variant="outline" onClick={onFull} disabled={remaining === 0}>전액 환불</Button>
        </div>
        <div className="mt-4 flex items-end gap-2">
          <TextField className="flex-1" label="부분 환불 금액" value={refundAmount} onChange={onRefundAmount} />
          <Button onClick={onPartial} disabled={remaining === 0}>부분 환불</Button>
        </div>
      </Panel>
    </div>
  );
}
