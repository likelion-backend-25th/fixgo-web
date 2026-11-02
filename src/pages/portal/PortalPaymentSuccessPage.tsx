import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { confirmPaymentOnce, parseAmountParam } from "@/lib/portalApi";
import { PortalFrame } from "@/pages/portal/PortalFrame";

export function PortalPaymentSuccessPage() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const paymentKey = params.get("paymentKey");
  const orderId = params.get("orderId");
  const amount = parseAmountParam(params.get("amount"));
  const canConfirm = paymentKey !== null && paymentKey !== "" && orderId !== null && orderId !== "" && amount !== null;
  const [attempt, setAttempt] = useState(0);
  const requestKey = canConfirm ? `${paymentKey}:${orderId}:${amount}:${attempt}` : "invalid";
  const [trackedKey, setTrackedKey] = useState(requestKey);
  const [phase, setPhase] = useState<"pending" | "error">("pending");
  const [message, setMessage] = useState("");
  if (trackedKey !== requestKey) {
    setTrackedKey(requestKey);
    setPhase("pending");
    setMessage("");
  }

  useEffect(() => {
    if (!canConfirm || paymentKey === null || orderId === null || amount === null) {
      return;
    }

    let active = true;
    confirmPaymentOnce({ paymentKey, orderId, amount })
      .then(() => {
        if (active) {
          navigate(`/portal/${token}`, { replace: true });
        }
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        setPhase("error");
        setMessage(error instanceof Error ? error.message : "결제 승인에 실패했습니다. 다시 시도해 주세요.");
      });

    return () => {
      active = false;
    };
  }, [amount, attempt, canConfirm, navigate, orderId, paymentKey, token]);

  const failed = !canConfirm || phase === "error";
  const failureMessage = !canConfirm ? "결제 승인에 필요한 정보가 없습니다." : message;

  return (
    <PortalFrame>
      {failed ? (
        <div>
          <p className="text-sm text-red-600">{failureMessage}</p>
          <div className="mt-4 flex flex-col gap-2">
            {canConfirm && (
              <Button onClick={() => setAttempt((current) => current + 1)}>승인 다시 시도</Button>
            )}
            <Button variant="outline" onClick={() => navigate(`/portal/${token}`)}>
              포털로 돌아가기
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-neutral-600">결제를 확인하고 있습니다.</p>
      )}
    </PortalFrame>
  );
}
