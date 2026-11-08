import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import { fetchEstimate, fetchReceptionReceipt, fetchRepairStatement } from "@/lib/asReceptionApi";
import { EstimateSheet, PaymentSheet, ReceiptSheet, RepairSheet } from "@/pages/as/DocumentSheets";
import type { EstimateDocument, ReceptionReceipt, RepairStatement } from "@/types/asReception";
import type { AsRecord } from "@/types/screen";

export type DocumentKind = "receipt" | "estimate" | "repair" | "payment";

const titleOf: Record<DocumentKind, string> = {
  receipt: "접수증",
  estimate: "견적서",
  repair: "수리 내역서",
  payment: "결제 내역서",
};

export function DocumentModal({
  kind,
  receptionId,
  record,
  onClose,
}: {
  kind: DocumentKind;
  receptionId: number;
  record: AsRecord;
  onClose: () => void;
}) {
  const [receipt, setReceipt] = useState<ReceptionReceipt | null>(null);
  const [estimate, setEstimate] = useState<EstimateDocument | null>(null);
  const [repair, setRepair] = useState<RepairStatement | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(kind !== "payment");

  useEffect(() => {
    if (kind === "payment") {
      return;
    }
    const controller = new AbortController();
    setReceipt(null);
    setEstimate(null);
    setRepair(null);
    setLoading(true);
    setError("");
    // 버튼마다 발급 API가 다르다. 없는 서류는 서버 메시지를 그대로 보여 준다.
    const request = kind === "receipt"
      ? fetchReceptionReceipt(receptionId, controller.signal).then(setReceipt)
      : kind === "estimate"
        ? fetchEstimate(receptionId, controller.signal).then(setEstimate)
        : fetchRepairStatement(receptionId, controller.signal).then(setRepair);
    request
      .catch((cause: unknown) => {
        if (isAbortError(cause)) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "서류를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [kind, receptionId]);

  const ready = kind === "payment" || (error === "" && !loading && (receipt !== null || estimate !== null || repair !== null));

  return (
    <Modal title={titleOf[kind]} onClose={onClose} wide={kind !== "receipt"}>
      {loading && <p className="text-sm text-neutral-500">서류를 불러오는 중입니다.</p>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      {kind === "receipt" && receipt !== null && <ReceiptSheet data={receipt} />}
      {kind === "estimate" && estimate !== null && <EstimateSheet data={estimate} />}
      {kind === "repair" && repair !== null && <RepairSheet data={repair} />}
      {kind === "payment" && <PaymentSheet record={record} />}
      <div className="mt-4 text-right">
        <Button onClick={() => window.print()} disabled={!ready}>인쇄</Button>
      </div>
    </Modal>
  );
}
