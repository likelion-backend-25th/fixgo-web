import { formatDateTime, won } from "@/lib/format";
import { returnMethodLabel } from "@/lib/asReceptionApi";
import { inspectionLines } from "@/mocks/screenData";
import type { EstimateDocument, ReceptionReceipt, RepairStatement } from "@/types/asReception";
import type { AsRecord } from "@/types/screen";
import type { ReactNode } from "react";

export function ReceiptSheet({ data }: { data: ReceptionReceipt }) {
  const address = [data.basicAddress, data.detailAddress].filter((part) => part !== null && part !== "").join(" ");
  return (
    <SheetFrame title="접수증">
      <dl className="grid grid-cols-[90px_1fr] gap-y-1">
        <Row label="접수번호" value={data.receptionNumber} />
        <Row label="접수일" value={formatDateTime(data.createdAt)} />
        <Row label="고객명" value={data.customerName} />
        <Row label="연락처" value={data.customerPhone} />
        <Row label="이메일" value={data.customerEmail} />
        <Row label="우편번호" value={data.zipcode ?? "-"} />
        <Row label="주소" value={address === "" ? "-" : address} />
        <Row label="모델명" value={data.modelName} />
        <Row label="시리얼번호" value={data.serialNumber} />
        <Row label="증상" value={data.symptom} />
        <Row label="수령 방식" value={returnMethodLabel(data.returnMethod)} />
        <Row label="접수 직원" value={data.receptionistName} />
        <Row label="담당 기사" value={data.technicianName ?? "-"} />
      </dl>
    </SheetFrame>
  );
}

export function EstimateSheet({ data }: { data: EstimateDocument }) {
  return (
    <SheetFrame title="견적서">
      <dl className="grid grid-cols-[90px_1fr] gap-y-1">
        <Row label="접수번호" value={data.receptionNumber} />
        <Row label="확정 시각" value={data.confirmedAt === null ? "-" : formatDateTime(data.confirmedAt)} />
        <Row label="공임 단가" value={won(data.laborRate)} />
        <Row label="점검비" value={won(data.inspectionCost)} />
      </dl>
      <table className="mt-4 w-full text-left">
        <thead className="bg-neutral-100">
          <tr>{["구분", "항목", "수량", "금액"].map((header) => <th key={header} className="px-2 py-1">{header}</th>)}</tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={`${item.category}-${index}`} className="border-t border-neutral-200">
              <td className="px-2 py-1">{item.category}</td>
              <td className="px-2 py-1">{item.name}</td>
              <td className="px-2 py-1">{item.quantity === null ? "-" : item.quantity}</td>
              <td className="px-2 py-1">{item.amount === null ? "-" : won(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-right font-semibold">합계 {won(data.totalAmount)}</p>
    </SheetFrame>
  );
}

export function RepairSheet({ data }: { data: RepairStatement }) {
  return (
    <SheetFrame title="수리내역서">
      <dl className="grid grid-cols-[90px_1fr] gap-y-1">
        <Row label="접수번호" value={data.receptionNumber} />
        <Row label="고객명" value={data.customerName} />
        <Row label="발행일" value={formatDateTime(data.issuedAt)} />
        <Row label="담당 기사" value={data.technicianName ?? "-"} />
        <Row label="작업 메모" value={data.workNote ?? "-"} />
      </dl>
      <table className="mt-4 w-full text-left">
        <thead className="bg-neutral-100">
          <tr>{["구분", "항목", "수량", "금액"].map((header) => <th key={header} className="px-2 py-1">{header}</th>)}</tr>
        </thead>
        <tbody>
          {data.repairWorks.map((work) => (
            <WorkRows key={work.repairWorkId} work={work} />
          ))}
          {data.laborCost > 0 && (
            <tr className="border-t border-neutral-200">
              <td className="px-2 py-1">공임</td>
              <td className="px-2 py-1">공임비</td>
              <td className="px-2 py-1">-</td>
              <td className="px-2 py-1">{won(data.laborCost)}</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-3 text-right font-semibold">합계 {won(data.finalAmount)}</p>
    </SheetFrame>
  );
}

export function PaymentSheet({ record }: { record: AsRecord }) {
  const lines = inspectionLines(record).filter((line) => line.amount > 0);
  const total = lines.reduce((sum, line) => sum + line.amount, 0);
  return (
    <SheetFrame title="결제 내역서">
      <dl className="grid grid-cols-[90px_1fr] gap-y-1">
        <Row label="접수번호" value={record.id} />
        <Row label="고객명" value={record.customerName} />
        <Row label="연락처" value={record.phone} />
      </dl>
      <p className="mt-3 text-right font-semibold">합계 {won(total === 0 ? 15000 : total)}</p>
      <p className="mt-2">결제 수단 카드 · 결제 상태 결제 완료</p>
    </SheetFrame>
  );
}

function WorkRows({ work }: { work: RepairStatement["repairWorks"][number] }) {
  const label = work.repairPresetName === null || work.repairPresetName === "" ? work.workName : `${work.workName} (${work.repairPresetName})`;
  return (
    <>
      <tr className="border-t border-neutral-200">
        <td className="px-2 py-1">작업</td>
        <td className="px-2 py-1">{label}</td>
        <td className="px-2 py-1">-</td>
        <td className="px-2 py-1">-</td>
      </tr>
      {work.usedParts.map((part) => (
        <tr key={part.id} className="border-t border-neutral-200">
          <td className="px-2 py-1">부품</td>
          <td className="px-2 py-1">{part.partName}</td>
          <td className="px-2 py-1">{part.quantity}</td>
          <td className="px-2 py-1">{won(part.totalPrice)}</td>
        </tr>
      ))}
    </>
  );
}

function SheetFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article data-print-sheet className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm">
      <p className="mb-4 text-center text-2xl font-semibold text-blue-600">FixGo</p>
      <p className="mb-3 text-center text-lg">{title}</p>
      {children}
    </article>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-neutral-500">{label}</dt>
      <dd>{value}</dd>
    </>
  );
}
