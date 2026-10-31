import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { includesText } from "@/lib/format";
import { emailRecords } from "@/mocks/screenData";
import type { EmailRecord } from "@/types/screen";

function displaySentAt(value: string): string {
  return value.replaceAll("-", ".");
}

export function NotificationListPage() {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("2024-10-01");
  const [to, setTo] = useState("2024-10-31");
  const [selected, setSelected] = useState<EmailRecord | null>(null);
  const rows = useMemo(
    () =>
      emailRecords.filter((row) => {
        const day = row.sentAt.slice(0, 10);
        return includesText(`${row.customerName} ${row.email}`, query) && day >= from && day <= to;
      }),
    [from, query, to],
  );
  const columns: Column<EmailRecord>[] = [
    { key: "id", header: "번호", render: (row) => row.id },
    { key: "at", header: "발송일시", render: (row) => displaySentAt(row.sentAt) },
    { key: "name", header: "고객명", render: (row) => row.customerName },
    { key: "email", header: "수신 이메일", render: (row) => row.email },
    { key: "body", header: "내용", render: (row) => row.summary },
    {
      key: "status",
      header: "발송 상태",
      render: (row) => <span className={cn(row.status === "성공" ? "text-green-600" : "text-red-600")}>{row.status}</span>,
    },
    { key: "detail", header: "상세보기", render: (row) => <Button variant="outline" onClick={() => setSelected(row)}>상세</Button> },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-sm text-neutral-500">전체 {rows.length}건</p>
        <TextField value={query} onChange={setQuery} placeholder="고객명, 이메일 검색" className="w-56" />
        <div className="ml-auto flex items-center gap-2">
          <TextField type="date" value={from} onChange={setFrom} className="w-40" />
          <span className="text-sm text-neutral-500">~</span>
          <TextField type="date" value={to} onChange={setTo} className="w-40" />
        </div>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} emptyText="조건에 맞는 발송 내역이 없습니다." />
      {selected !== null && <EmailDetailModal record={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function EmailDetailModal({ record, onClose }: { record: EmailRecord; onClose: () => void }) {
  const failed = record.status === "실패";
  return (
    <Modal title="이메일 발송 상세" wide onClose={onClose}>
      <div className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <Field label="발송번호" value={record.id} />
        <Field label="발송일시" value={displaySentAt(record.sentAt)} />
        <Field label="발송 상태" value={<span className={failed ? "text-red-600" : "text-green-600"}>{failed ? "발송실패" : "발송성공"}</span>} />
      </div>
      <h3 className="mt-5 mb-2 text-sm font-medium">수신자 정보</h3>
      <div className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <Field label="고객명" value={record.customerName} />
        <Field label="이메일" value={record.email} />
        <Field label="접수번호" value={record.asId} />
      </div>
      <h3 className="mt-5 mb-2 text-sm font-medium">이메일 제목</h3>
      <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">{record.subject}</p>
      <h3 className="mt-5 mb-2 text-sm font-medium">이메일 본문</h3>
      <p className="whitespace-pre-line rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm">{record.body}</p>
      <h3 className="mt-5 mb-2 text-sm font-medium">발송 결과</h3>
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-neutral-100 text-left">
            <tr>
              {["발송 채널", "결과", "발송 시각", "실패 사유"].map((header) => (
                <th key={header} className="px-3 py-2 font-medium">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-neutral-200">
              <td className="px-3 py-2">{record.channel}</td>
              <td className={cn("px-3 py-2", failed ? "text-red-600" : "text-green-600")}>{failed ? "실패" : "성공"}</td>
              <td className="px-3 py-2">{displaySentAt(record.sentAt)}</td>
              <td className="px-3 py-2">{record.failReason}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
