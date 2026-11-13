import { useEffect, useRef, useState } from "react";
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

const NOT_ISSUED = "아직 발급되지 않은 서류입니다.";

function documentError(kind: DocumentKind, cause: unknown): string {
  const message = cause instanceof Error ? cause.message : "서류를 불러오지 못했습니다.";
  if (kind !== "estimate" && kind !== "repair") {
    return message;
  }
  // 접수 직후처럼 서류가 아직 없을 때는 서버의 원인 문구 대신 같은 안내를 보여 준다.
  if (
    message === "수리 정보를 찾을 수 없습니다."
    || message === "아직 수리비가 확정되지 않았습니다."
    || message === "수리가 완료된 건만 내역서를 조회할 수 있습니다."
  ) {
    return NOT_ISSUED;
  }
  return message;
}

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
        setError(documentError(kind, cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [kind, receptionId]);

  const ready = kind === "payment" || (error === "" && !loading && (receipt !== null || estimate !== null || repair !== null));
  const sheetRef = useRef<HTMLDivElement>(null);

  function printDocument() {
    const sheet = sheetRef.current?.querySelector("[data-print-sheet]");
    if (!(sheet instanceof HTMLElement)) {
      return;
    }
    // 서류만 인쇄한다. 화면 자체를 display:none 하면 프린터 선택 창이 바로 닫힌다.
    document.querySelectorAll(".print-host").forEach((node) => node.remove());
    const host = document.createElement("div");
    host.className = "print-host";
    host.append(sheet.cloneNode(true));
    document.body.append(host);
    document.body.classList.add("printing-document");
    const cleanup = () => {
      host.remove();
      document.body.classList.remove("printing-document");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  return (
    <Modal title={titleOf[kind]} onClose={onClose} wide={kind !== "receipt"}>
      {loading && <p className="text-sm text-neutral-500">서류를 불러오는 중입니다.</p>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <div ref={sheetRef}>
        {kind === "receipt" && receipt !== null && <ReceiptSheet data={receipt} />}
        {kind === "estimate" && estimate !== null && <EstimateSheet data={estimate} />}
        {kind === "repair" && repair !== null && <RepairSheet data={repair} />}
        {kind === "payment" && <PaymentSheet record={record} />}
      </div>
      <div className="mt-4 text-right print:hidden">
        <Button onClick={printDocument} disabled={!ready}>인쇄</Button>
      </div>
    </Modal>
  );
}
