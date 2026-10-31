import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { won } from "@/lib/format";
import { inspectionLines } from "@/mocks/screenData";
import type { AsRecord } from "@/types/screen";

export type DocumentKind = "receipt" | "estimate" | "repair" | "payment";

const titleOf: Record<DocumentKind, string> = {
  receipt: "접수증",
  estimate: "견적서",
  repair: "수리 내역서",
  payment: "결제 내역서",
};

export function DocumentModal({ kind, record, onClose }: { kind: DocumentKind; record: AsRecord; onClose: () => void }) {
  const lines = inspectionLines(record);
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return (
    <Modal title={titleOf[kind]} onClose={onClose}>
      <article className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
        <p className="mb-4 text-center text-2xl font-semibold text-blue-600">FixGo</p>
        <p className="mb-3 text-center text-lg">{titleOf[kind]}</p>
        <dl className="grid grid-cols-[90px_1fr] gap-y-1">
          <dt className="text-neutral-500">접수번호</dt><dd>{record.id}</dd>
          <dt className="text-neutral-500">고객명</dt><dd>{record.customerName}</dd>
          <dt className="text-neutral-500">연락처</dt><dd>{record.phone}</dd>
          <dt className="text-neutral-500">제품</dt><dd>{record.productGroup} {record.modelName}</dd>
          <dt className="text-neutral-500">시리얼번호</dt><dd>{record.serial}</dd>
          <dt className="text-neutral-500">증상</dt><dd>{record.symptom}</dd>
          <dt className="text-neutral-500">수령 방식</dt><dd>{record.receiveMethod}</dd>
          <dt className="text-neutral-500">담당 기사</dt><dd>{record.technician}</dd>
        </dl>
        {kind !== "receipt" && (
          <table className="mt-4 w-full text-left">
            <thead className="bg-neutral-100">
              <tr>{["구분", "항목", "금액"].map((header) => <th key={header} className="px-2 py-1">{header}</th>)}</tr>
            </thead>
            <tbody>
              {lines.filter((line) => line.amount > 0).map((line) => (
                <tr key={line.id} className="border-t border-neutral-200">
                  <td className="px-2 py-1">{line.kind}</td>
                  <td className="px-2 py-1">{line.name}</td>
                  <td className="px-2 py-1">{won(line.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {kind !== "receipt" && <p className="mt-3 text-right font-semibold">합계 {won(total === 0 ? 15000 : total)}</p>}
        {kind === "payment" && <p className="mt-2">결제 수단 카드 · 결제 상태 결제 완료</p>}
        {kind === "estimate" && <p className="mt-2">최종 판정: 보증 기간 내 무상</p>}
      </article>
      <div className="mt-4 text-right">
        <Button onClick={() => window.print()}>인쇄</Button>
      </div>
    </Modal>
  );
}
