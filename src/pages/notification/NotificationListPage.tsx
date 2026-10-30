import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import { includesText } from "@/lib/format";
import { smsRecords } from "@/mocks/screenData";
import type { SmsRecord } from "@/types/screen";

export function NotificationListPage() {
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("2026-10-01");
  const [to, setTo] = useState("2026-10-30");
  const [selected, setSelected] = useState<SmsRecord | null>(null);
  const rows = useMemo(
    () =>
      smsRecords.filter((row) => {
        const day = row.sentAt.slice(0, 10);
        return includesText(`${row.customerName} ${row.phone}`, query) && day >= from && day <= to;
      }),
    [from, query, to],
  );
  const columns: Column<SmsRecord>[] = [
    { key: "id", header: "번호", render: (row) => row.id },
    { key: "at", header: "발송일시", render: (row) => row.sentAt },
    { key: "name", header: "고객명", render: (row) => row.customerName },
    { key: "phone", header: "휴대폰 번호", render: (row) => row.phone },
    { key: "body", header: "내용", render: (row) => <span className="line-clamp-1">{row.body}</span> },
    { key: "status", header: "발송 상태", render: (row) => <span className={cn(row.status === "성공" ? "text-green-600" : "text-red-600")}>{row.status}</span> },
    { key: "detail", header: "", render: (row) => <Button variant="outline" onClick={() => setSelected(row)}>상세보기</Button> },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <TextField value={query} onChange={setQuery} placeholder="고객명, 휴대폰번호" className="w-56" />
        <TextField label="시작일" type="date" value={from} onChange={setFrom} className="w-40" />
        <TextField label="종료일" type="date" value={to} onChange={setTo} className="w-40" />
        <p className="ml-auto text-sm text-neutral-500">전체 {rows.length}건</p>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} emptyText="조건에 맞는 발송 내역이 없습니다." />
      {selected !== null && (
        <Modal title="SMS 발송 상세" onClose={() => setSelected(null)}>
          <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
            <dt className="text-neutral-500">발송번호</dt><dd>{selected.id}</dd>
            <dt className="text-neutral-500">발송일시</dt><dd>{selected.sentAt}</dd>
            <dt className="text-neutral-500">발송유형</dt><dd>{selected.channel}</dd>
            <dt className="text-neutral-500">발송상태</dt><dd>{selected.status}</dd>
            <dt className="text-neutral-500">고객명</dt><dd>{selected.customerName}</dd>
            <dt className="text-neutral-500">휴대폰번호</dt><dd>{selected.phone}</dd>
            <dt className="text-neutral-500">이메일</dt><dd>{selected.email}</dd>
            <dt className="text-neutral-500">접수번호</dt><dd>{selected.asId}</dd>
            <dt className="text-neutral-500">내용</dt><dd className="whitespace-pre-line">{selected.body}</dd>
            <dt className="text-neutral-500">실패사유</dt><dd>{selected.failReason}</dd>
          </dl>
        </Modal>
      )}
    </div>
  );
}
