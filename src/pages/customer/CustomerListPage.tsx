import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { includesText } from "@/lib/format";
import { usePageSlice } from "@/lib/usePageSlice";
import { customers } from "@/mocks/screenData";
import type { CustomerRecord } from "@/types/screen";

export function CustomerListPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const rows = useMemo(
    () => customers.filter((row) => includesText(`${row.name} ${row.phone}`, query)),
    [query],
  );
  const table = usePageSlice(rows);
  const columns: Column<CustomerRecord>[] = [
    { key: "name", header: "고객명", render: (row) => row.name },
    { key: "phone", header: "연락처", render: (row) => row.phone },
    { key: "email", header: "이메일", render: (row) => row.email },
    { key: "date", header: "등록일", render: (row) => row.registeredAt },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField value={query} onChange={setQuery} placeholder="고객명, 연락처 검색" className="w-64" />
        <Button className="ml-auto" onClick={() => setOpen(true)}>엑셀 일괄 등록</Button>
      </div>
      <DataTable columns={columns} rows={table.slice} rowKey={(row) => row.id} onRowClick={(row) => navigate(`/customer/${row.id}`)} />
      <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} />
      {open && <ExcelModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function ExcelModal({ onClose }: { onClose: () => void }) {
  const [fileName, setFileName] = useState("");
  const [notice, setNotice] = useState("");
  const preview = [
    { name: "홍길동", phone: "010-1111-2222", ok: true },
    { name: "", phone: "010", ok: false },
  ];

  return (
    <Modal title="고객 엑셀 일괄 등록" onClose={onClose}>
      <div className="mb-3 flex gap-2">
        <Button
          variant="outline"
          onClick={() => {
            const blob = new Blob(["이름,연락처,이메일,주소\n"], { type: "text/csv;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "fixgo-customers.csv";
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          양식 다운로드
        </Button>
        <label className="inline-flex cursor-pointer items-center rounded border border-blue-600 px-4 py-2 text-sm text-blue-600">
          엑셀 업로드
          <input
            type="file"
            accept=".csv,.xlsx"
            className="sr-only"
            onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
          />
        </label>
      </div>
      {fileName !== "" && <p className="mb-2 text-sm">파일명 {fileName}</p>}
      <ul className="divide-y divide-neutral-200 rounded border border-neutral-300 text-sm">
        {preview.map((row) => (
          <li key={row.phone} className="flex justify-between px-3 py-2">
            <span>{row.name || "(이름 없음)"} · {row.phone}</span>
            <span className={row.ok ? "text-green-600" : "text-red-600"}>{row.ok ? "등록 가능" : "형식 오류"}</span>
          </li>
        ))}
      </ul>
      {notice !== "" && <div className="mt-3"><Notice>{notice}</Notice></div>}
      <div className="mt-4 text-right">
        <Button onClick={() => setNotice("등록 가능한 고객을 일괄 등록했습니다.")}>고객 일괄 등록</Button>
      </div>
    </Modal>
  );
}
