import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/cn";
import { includesText } from "@/lib/format";
import { usePageSlice } from "@/lib/usePageSlice";
import { shipments } from "@/mocks/screenData";
import type { ShipmentRecord } from "@/types/screen";

export function ShipmentListPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("전체");
  const [method, setMethod] = useState("전체");
  const [selected, setSelected] = useState<ShipmentRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const rows = useMemo(
    () =>
      shipments.filter((row) => {
        const matched = includesText(`${row.asId} ${row.receiver} ${row.trackingNo}`, query);
        return matched && (status === "전체" || row.status === status) && (method === "전체" || row.method === method);
      }),
    [method, query, status],
  );
  const table = usePageSlice(rows);
  const counts = {
    wait: shipments.filter((row) => row.status === "배송대기").length,
    ing: shipments.filter((row) => row.status === "배송중").length,
    done: shipments.filter((row) => row.status === "배송완료").length,
    visit: shipments.filter((row) => row.method === "방문 수령").length,
  };
  const columns: Column<ShipmentRecord>[] = [
    { key: "no", header: "번호", render: (row) => row.no },
    { key: "as", header: "접수번호", render: (row) => row.asId },
    { key: "method", header: "수령 방법", render: (row) => row.method },
    { key: "receiver", header: "수령인", render: (row) => row.receiver },
    { key: "phone", header: "연락처", render: (row) => row.phone },
    { key: "carrier", header: "택배사", render: (row) => row.carrier },
    { key: "tracking", header: "운송장번호", render: (row) => row.trackingNo },
    { key: "status", header: "상태", render: (row) => <StatusLabel value={row.status} /> },
    { key: "started", header: "발송 시각", render: (row) => row.startedAt },
    {
      key: "detail",
      header: "",
      render: (row) => <Button onClick={() => setSelected(row)}>상세보기</Button>,
    },
  ];

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat label="배송 대기" value={`${counts.wait}건`} />
        <Stat label="배송중" value={`${counts.ing}건`} />
        <Stat label="배송 완료" value={`${counts.done}건`} />
        <Stat label="방문 수령" value={`${counts.visit}건`} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField value={query} onChange={setQuery} placeholder="접수번호, 수령인, 운송장번호 검색" className="w-72" />
        <span className="text-sm text-neutral-500">전체 {rows.length}건</span>
        <SelectBox value={status} onChange={setStatus} options={["전체", "배송대기", "배송중", "배송완료", "수령완료"].map((value) => ({ value, label: value === "전체" ? "상태 전체" : value }))} />
        <SelectBox value={method} onChange={setMethod} options={[{ value: "전체", label: "수령 방법 전체" }, { value: "택배", label: "택배" }, { value: "방문 수령", label: "방문 수령" }]} />
        <Button className="ml-auto" onClick={() => setCreating(true)}>등록</Button>
      </div>
      <DataTable columns={columns} rows={table.slice} rowKey={(row) => String(row.no)} selectedKey={selected === null ? undefined : String(selected.no)} />
      <Pagination page={table.page} pageCount={table.pageCount} onPageChange={table.setPage} />
      {creating && <CreateShipmentModal onClose={() => setCreating(false)} />}
      {selected !== null && <ShipmentDetailModal shipment={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-300 p-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-blue-600">{value}</p>
    </div>
  );
}

function StatusLabel({ value }: { value: string }) {
  return (
    <span className={cn(value === "배송중" && "text-blue-600", (value === "배송완료" || value === "수령완료") && "text-green-600")}>
      {value}
    </span>
  );
}

function CreateShipmentModal({ onClose }: { onClose: () => void }) {
  const [trackingNo, setTrackingNo] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const valid = /^\d{4}-\d{4}$/.test(trackingNo);

  return (
    <Modal title="배송 등록" onClose={onClose}>
      <p className="mb-3 text-sm text-neutral-600">AS-2026-1112 · 수령인 한소희 · 택배</p>
      <TextField label="운송장번호" value={trackingNo} onChange={setTrackingNo} placeholder="0000-0000" />
      {error !== "" && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
      {notice !== "" && <div className="mt-3"><Notice>{notice}</Notice></div>}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (!valid) {
              setError("택배사 운송장 형식(0000-0000)이 아닙니다.");
              return;
            }
            setError("");
            setNotice("운송장번호를 등록했습니다.");
          }}
        >
          운송장 등록
        </Button>
        <Button
          disabled={!valid}
          onClick={() => setNotice("배송 시작 알림을 발송했습니다.")}
        >
          배송 시작 알림
        </Button>
      </div>
    </Modal>
  );
}

function ShipmentDetailModal({ shipment, onClose }: { shipment: ShipmentRecord; onClose: () => void }) {
  const [trackingNo, setTrackingNo] = useState(shipment.trackingNo === "-" ? "" : shipment.trackingNo);
  const [notice, setNotice] = useState("");
  return (
    <Modal title="배송 상세" onClose={onClose}>
      <div className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
        <p>접수번호 {shipment.asId}</p>
        <p>수령인 {shipment.receiver}</p>
        <p>택배사 {shipment.carrier}</p>
        <p>상태 {shipment.status}</p>
      </div>
      <TextField label="운송장번호" value={trackingNo} onChange={setTrackingNo} />
      <ul className="mt-4 space-y-2 text-sm">
        <li>2026-10-25 14:10 · 운송장 등록 · 성공</li>
        <li>2026-10-25 18:40 · 집화완료 · 성공</li>
      </ul>
      {notice !== "" && <div className="mt-3"><Notice>{notice}</Notice></div>}
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={() => setNotice("운송장번호를 수정했습니다.")}>운송장 수정</Button>
        <Button onClick={() => setNotice("배송 완료로 처리했습니다.")}>배송 완료</Button>
      </div>
    </Modal>
  );
}
