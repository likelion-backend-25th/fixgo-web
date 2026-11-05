import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { FieldLabel, SelectBox, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { cn } from "@/lib/cn";
import { sweetTrackerCarriers } from "@/lib/sweetTrackerCarriers";
import { includesText } from "@/lib/format";
import { usePageSlice } from "@/lib/usePageSlice";
import { asRecords, shipments } from "@/mocks/screenData";
import type { AsRecord, ShipmentRecord } from "@/types/screen";

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
      render: (row) => <Button onClick={() => setSelected(row)}>상세</Button>,
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
        <SelectBox value={status} onChange={setStatus} options={["전체", "배송대기", "배송중", "배송완료", "미수령", "수령완료"].map((value) => ({ value, label: value === "전체" ? "상태 전체" : value }))} />
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
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
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
  const [asId, setAsId] = useState("");
  const [lookupQuery, setLookupQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const [receiver, setReceiver] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [carrier, setCarrier] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const trackingValid = /^\d{4}-\d{4}$/.test(trackingNo);
  const filled = asId.trim() !== "" && receiver.trim() !== "" && phone.trim() !== "" && address.trim() !== "" && carrier.trim() !== "";

  function validate(): boolean {
    if (!filled) {
      setError("접수번호, 고객이름, 연락처, 기본 주소, 택배사를 입력해 주세요.");
      setNotice("");
      return false;
    }
    if (!trackingValid) {
      setError("택배사 운송장 형식(0000-0000)이 아닙니다.");
      setNotice("");
      return false;
    }
    setError("");
    return true;
  }

  return (
    <>
    <Modal
      title="배송 등록"
      onClose={() => {
        if (picking) {
          return;
        }
        onClose();
      }}
    >
      <div className="space-y-4">
        <div>
          <FieldLabel>접수번호</FieldLabel>
          <div className="flex items-center gap-2">
            <TextField value={asId} onChange={setAsId} placeholder="AS-2026-0000" className="min-w-0 flex-1" />
            <TextField value={lookupQuery} onChange={setLookupQuery} placeholder="접수번호, 고객명" className="w-36" />
            <Button variant="outline" className="shrink-0" onClick={() => setPicking(true)}>검색</Button>
          </div>
        </div>
        <TextField label="고객이름" value={receiver} onChange={setReceiver} />
        <TextField label="연락처" value={phone} onChange={setPhone} placeholder="010-0000-0000" />
        <TextField label="기본 주소" value={address} onChange={setAddress} placeholder="도로명 주소" />
        <TextField label="상세 주소" value={addressDetail} onChange={setAddressDetail} placeholder="동, 호수" />
        <label className="block text-sm">
          <FieldLabel>택배사</FieldLabel>
          <SelectBox
            className="w-full"
            value={carrier}
            onChange={setCarrier}
            options={[
              { value: "", label: "택배사 선택" },
              ...sweetTrackerCarriers.map((item) => ({ value: item.name, label: item.name })),
            ]}
          />
        </label>
        <TextField label="운송장번호" value={trackingNo} onChange={setTrackingNo} placeholder="0000-0000" />
      </div>
      {error !== "" && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
      {notice !== "" && <div className="mt-3"><Notice>{notice}</Notice></div>}
      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => {
            if (!validate()) {
              return;
            }
            setNotice("운송장번호를 등록했습니다.");
          }}
        >
          운송장 등록
        </Button>
        <Button
          disabled={!filled || !trackingValid}
          onClick={() => {
            if (!validate()) {
              return;
            }
            setNotice("배송 시작 알림을 발송했습니다.");
          }}
        >
          배송 시작 알림
        </Button>
      </div>
    </Modal>
    {picking && (
      <CompletedReceptionModal
        query={lookupQuery}
        onQueryChange={setLookupQuery}
        onClose={() => setPicking(false)}
        onApply={(row) => {
          setAsId(row.id);
          setReceiver(row.customerName);
          setPhone(row.phone);
          setAddress(row.address);
          setAddressDetail(row.addressDetail);
          setError("");
          setPicking(false);
        }}
      />
    )}
    </>
  );
}

function CompletedReceptionModal({
  query,
  onQueryChange,
  onClose,
  onApply,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onApply: (row: AsRecord) => void;
}) {
  const [selected, setSelected] = useState("");
  const rows = useMemo(
    () =>
      asRecords.filter(
        (row) => row.status === "완료" && includesText(`${row.id} ${row.customerName} ${row.phone} ${row.email}`, query),
      ),
    [query],
  );
  const columns: Column<AsRecord>[] = [
    { key: "id", header: "접수번호", render: (row) => row.id },
    { key: "customer", header: "고객명", render: (row) => row.customerName },
    { key: "phone", header: "연락처", render: (row) => row.phone },
    { key: "email", header: "이메일", render: (row) => row.email },
  ];

  return (
    <Modal title="접수 완료 A/S" wide onClose={onClose}>
      <TextField value={query} onChange={onQueryChange} placeholder="접수번호, 고객명, 이메일 검색" className="mb-3 w-72" />
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        selectedKey={selected}
        onRowClick={(row) => setSelected(row.id)}
        emptyText="접수 완료된 접수가 없습니다."
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>취소</Button>
        <Button
          onClick={() => {
            const row = rows.find((item) => item.id === selected);
            if (row === undefined) {
              return;
            }
            onApply(row);
          }}
        >
          적용
        </Button>
      </div>
    </Modal>
  );
}

const shipmentHistory = [
  { title: "운송장 등록", at: "2026.10.25 14:10" },
  { title: "집화 완료", at: "2026.10.25 18:40" },
  { title: "배송중", at: "2026.10.26 09:20" },
];

function ShipmentHistory() {
  return (
    <div className="rounded-lg border border-neutral-300 bg-white px-4 py-3">
      <FieldLabel>배송 이력</FieldLabel>
      <ol>
        {shipmentHistory.map((item, index) => {
          const last = index === shipmentHistory.length - 1;
          return (
            <li key={item.title} className="flex gap-3">
              <div className="flex w-4 flex-col items-center">
                <span className="text-sm font-semibold leading-5 text-neutral-900">{index + 1}</span>
                {!last && <span className="mt-1 w-px flex-1 bg-neutral-300" />}
              </div>
              <div className={cn("min-w-0", last ? "pb-0" : "pb-4")}>
                <p className="text-sm font-semibold leading-5 text-neutral-900">{item.title}</p>
                <p className="mt-1 text-xs text-neutral-500">{item.at}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ShipmentDetailModal({ shipment, onClose }: { shipment: ShipmentRecord; onClose: () => void }) {
  const visit = shipment.method === "방문 수령";
  const [trackingNo, setTrackingNo] = useState(shipment.trackingNo === "-" ? "" : shipment.trackingNo);
  const [notice, setNotice] = useState("");
  return (
    <Modal title="배송 상세" onClose={onClose}>
      <div className="space-y-4">
        <TextField label="접수번호" value={shipment.asId} onChange={() => undefined} readOnly />
        <TextField label="수령인" value={shipment.receiver} onChange={() => undefined} readOnly />
        {shipment.method === "택배" && (
          <>
            <TextField label="기본 주소" value={shipment.address} onChange={() => undefined} readOnly />
            <TextField label="상세 주소" value={shipment.addressDetail} onChange={() => undefined} readOnly />
          </>
        )}
        {!visit && <TextField label="택배사" value={shipment.carrier} onChange={() => undefined} readOnly />}
        <label className="block text-sm">
          <FieldLabel>상태</FieldLabel>
          <div className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm">
            <StatusLabel value={shipment.status} />
          </div>
        </label>
        {!visit && (
          <>
            <TextField label="운송장번호" value={trackingNo} onChange={setTrackingNo} placeholder="0000-0000" />
            <ShipmentHistory />
          </>
        )}
      </div>
      {notice !== "" && <div className="mt-3"><Notice>{notice}</Notice></div>}
      <div className="mt-4 flex justify-end gap-2">
        {!visit && (
          <Button variant="outline" onClick={() => setNotice("운송장번호를 수정했습니다.")}>운송장 수정</Button>
        )}
        <Button onClick={() => setNotice(visit ? "수령 완료로 처리했습니다." : "배송 완료로 처리했습니다.")}>
          {visit ? "수령 완료" : "배송 완료"}
        </Button>
      </div>
    </Modal>
  );
}
