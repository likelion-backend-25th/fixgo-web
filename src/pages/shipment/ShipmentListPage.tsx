import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { FieldLabel, SelectBox, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { fetchReception, fetchReceptions, receptionStatusLabel } from "@/lib/asReceptionApi";
import { isAbortError } from "@/lib/apiClient";
import { cn } from "@/lib/cn";
import {
  createPickup,
  createShipment,
  fetchShipmentByReception,
  fetchShipmentDetail,
  fetchShipmentManagement,
  getShipmentByReception,
  markShipmentDelivered,
  markShipmentPickedUp,
  markShipmentShipping,
  refreshShipmentTracking,
  shipmentEventLabel,
  shipmentMethodLabel,
  shipmentStatusLabel,
  updateShipmentTracking,
  type ShipmentDetail,
  type ShipmentManagementItem,
  type ShipmentManagementStatus,
  type ShipmentReturnMethod,
} from "@/lib/shipmentApi";
import { carrierLabel, sweetTrackerCarriers } from "@/lib/sweetTrackerCarriers";
import type { AsReceptionStatus } from "@/types/asReception";

type ShipmentListStatus =
  | "배송 등록 대기"
  | "배송 준비 완료"
  | "배송 중"
  | "배송 완료"
  | "방문 수령 대기"
  | "방문 수령 완료";

interface ShipmentRow {
  no: number;
  shipmentId: number | null;
  asReceptionId: number;
  asId: string;
  method: "택배" | "방문 수령";
  receiver: string;
  phone: string;
  carrier: string;
  trackingNo: string;
  status: ShipmentListStatus;
  startedAt: string;
}

interface CreateInitial {
  asReceptionId: number;
  receptionNumber: string;
  returnMethod: ShipmentReturnMethod;
  receiver: string;
  phone: string;
  address: string;
  addressDetail: string;
}

const statusFilters: { value: "전체" | ShipmentListStatus; label: string }[] = [
  { value: "전체", label: "상태 전체" },
  { value: "배송 등록 대기", label: "배송 등록 대기" },
  { value: "배송 준비 완료", label: "배송 준비 완료" },
  { value: "배송 중", label: "배송 중" },
  { value: "배송 완료", label: "배송 완료" },
  { value: "방문 수령 대기", label: "방문 수령 대기" },
  { value: "방문 수령 완료", label: "방문 수령 완료" },
];

interface ReceptionPick {
  id: number;
  receptionNumber: string;
  customerName: string;
  phone: string;
  status: AsReceptionStatus;
}

const pageSize = 20;

export function ShipmentListPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("전체");
  const [method, setMethod] = useState("전체");
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [rows, setRows] = useState<ShipmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createInitial, setCreateInitial] = useState<CreateInitial | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionNotice, setActionNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [counts, setCounts] = useState({ wait: 0, ing: 0, done: 0, visit: 0 });

  async function runRowAction(row: ShipmentRow) {
    setActionNotice("");
    setActionError("");
    if (row.status === "배송 완료" || row.status === "방문 수령 완료") {
      if (row.shipmentId !== null) {
        setSelectedId(row.shipmentId);
      }
      return;
    }
    if (row.status === "배송 등록 대기") {
      setBusyId(row.asReceptionId);
      try {
        const detail = await fetchReception(row.asReceptionId, new AbortController().signal);
        setCreateInitial({
          asReceptionId: detail.id,
          receptionNumber: detail.receptionNumber,
          returnMethod: detail.returnMethod,
          receiver: detail.customer.name,
          phone: detail.customer.phone,
          address: detail.customer.basicAddress ?? "",
          addressDetail: detail.customer.detailAddress ?? "",
        });
        setCreating(true);
      } catch (caught: unknown) {
        if (!isAbortError(caught)) {
          setActionError(caught instanceof Error ? caught.message : "접수 정보를 불러오지 못했습니다.");
        }
      } finally {
        setBusyId(null);
      }
      return;
    }
    setBusyId(row.asReceptionId);
    try {
      if (row.status === "배송 준비 완료" && row.shipmentId !== null) {
        await markShipmentShipping(row.shipmentId);
        setActionNotice("배송을 시작했습니다.");
      } else if (row.status === "배송 중" && row.shipmentId !== null) {
        await refreshShipmentTracking(row.shipmentId);
        setActionNotice("배송 이력을 갱신했습니다.");
        setSelectedId(row.shipmentId);
      } else if (row.status === "방문 수령 대기" && row.shipmentId === null) {
        await createPickup(row.asReceptionId);
        setActionNotice("방문 수령을 등록했습니다.");
      } else if (row.status === "방문 수령 대기" && row.shipmentId !== null) {
        await markShipmentPickedUp(row.shipmentId);
        setActionNotice("수령 완료로 처리했습니다.");
      }
      setReloadKey((value) => value + 1);
    } catch (caught: unknown) {
      setActionError(caught instanceof Error ? caught.message : "배송 상태를 변경하지 못했습니다.");
    } finally {
      setBusyId(null);
    }
  }
  const columns: Column<ShipmentRow>[] = [
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
      render: (row) => {
        const shipmentId = row.shipmentId;
        return (
          <div className="flex justify-end gap-2 whitespace-nowrap">
            {row.status === "배송 준비 완료" && shipmentId !== null && (
              <Button
                variant="outline"
                className="whitespace-nowrap"
                disabled={busyId === row.asReceptionId}
                onClick={() => setSelectedId(shipmentId)}
              >
                수정
              </Button>
            )}
            <Button
              variant={row.status === "배송 완료" || row.status === "방문 수령 완료" || row.status === "배송 중" ? "outline" : "primary"}
              disabled={busyId === row.asReceptionId}
              onClick={() => void runRowAction(row)}
            >
              {rowActionLabel(row)}
            </Button>
          </div>
        );
      },
    },
  ];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchShipmentManagement({
      keyword: query.trim(),
      status: toManagementStatus(status),
      returnMethod: toManagementMethod(method),
      page,
      size: pageSize,
    }, controller.signal)
      .then((result) => {
        setRows(result.items.flatMap((item, index) => {
          const row = toRow(item, result.number * result.size + index + 1);
          return row === null ? [] : [row];
        }));
        setPageCount(Math.max(1, result.totalPages));
        setLoadError("");
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) {
          return;
        }
        setRows([]);
        setLoadError(error instanceof Error ? error.message : "배송 목록을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [method, page, query, reloadKey, status]);

  useEffect(() => {
    const controller = new AbortController();
    const empty = { keyword: "", returnMethod: "ALL" as const, page: 1, size: 1 };
    Promise.all([
      fetchShipmentManagement({ ...empty, status: "AWAITING_SHIPMENT" }, controller.signal),
      fetchShipmentManagement({ ...empty, status: "READY" }, controller.signal),
      fetchShipmentManagement({ ...empty, status: "SHIPPING" }, controller.signal),
      fetchShipmentManagement({ ...empty, status: "DELIVERED" }, controller.signal),
      fetchShipmentManagement({ ...empty, status: "ALL", returnMethod: "PICKUP" }, controller.signal),
    ])
      .then(([waiting, ready, shipping, delivered, pickup]) => {
        setCounts({
          wait: waiting.totalElements + ready.totalElements,
          ing: shipping.totalElements,
          done: delivered.totalElements,
          visit: pickup.totalElements,
        });
      })
      .catch((error: unknown) => {
        if (!isAbortError(error)) {
          setCounts({ wait: 0, ing: 0, done: 0, visit: 0 });
        }
      });
    return () => controller.abort();
  }, [reloadKey]);

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Stat label="배송 대기" value={`${counts.wait}건`} />
        <Stat label="배송중" value={`${counts.ing}건`} />
        <Stat label="배송 완료" value={`${counts.done}건`} />
        <Stat label="방문 수령" value={`${counts.visit}건`} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <TextField value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="접수번호, 수령인, 운송장번호 검색" className="w-72" />
        <SelectBox value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={statusFilters} />
        <SelectBox value={method} onChange={(value) => { setMethod(value); setPage(1); }} options={[{ value: "전체", label: "수령 방법 전체" }, { value: "택배", label: "택배" }, { value: "방문 수령", label: "방문 수령" }]} />
        <Button className="ml-auto" onClick={() => { setCreateInitial(null); setCreating(true); }}>등록</Button>
      </div>
      {loadError !== "" && <div className="mb-3"><Notice tone="error">{loadError}</Notice></div>}
      {actionError !== "" && <div className="mb-3"><Notice tone="error">{actionError}</Notice></div>}
      {actionNotice !== "" && <div className="mb-3"><Notice>{actionNotice}</Notice></div>}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.asReceptionId)}
        selectedKey={selectedId === null ? undefined : String(rows.find((row) => row.shipmentId === selectedId)?.asReceptionId ?? "")}
        emptyText={loading ? "불러오는 중" : "배송 내역이 없습니다."}
      />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      {creating && (
        <CreateShipmentModal
          initial={createInitial}
          onClose={() => {
            setCreating(false);
            setCreateInitial(null);
          }}
          onRegistered={() => setReloadKey((value) => value + 1)}
        />
      )}
      {selectedId !== null && (
        <ShipmentDetailModal
          shipmentId={selectedId}
          onClose={() => setSelectedId(null)}
          onChanged={() => setReloadKey((value) => value + 1)}
        />
      )}
    </div>
  );
}

function toManagementStatus(value: string): ShipmentManagementStatus {
  if (value === "배송 등록 대기") return "AWAITING_SHIPMENT";
  if (value === "배송 준비 완료") return "READY";
  if (value === "배송 중") return "SHIPPING";
  if (value === "배송 완료") return "DELIVERED";
  if (value === "방문 수령 대기") return "AWAITING_PICKUP";
  if (value === "방문 수령 완료") return "PICKED_UP";
  return "ALL";
}

function toManagementMethod(value: string): "ALL" | ShipmentReturnMethod {
  if (value === "택배") return "DELIVERY";
  if (value === "방문 수령") return "PICKUP";
  return "ALL";
}

function rowActionLabel(row: ShipmentRow): string {
  if (row.status === "배송 등록 대기") return "배송 등록";
  if (row.status === "배송 준비 완료") return "배송 알림";
  if (row.status === "배송 중") return "배송 조회";
  if (row.status === "방문 수령 대기") return row.shipmentId === null ? "수령 등록" : "수령 완료";
  return "상세 보기";
}

function listStatus(item: ShipmentManagementItem): ShipmentListStatus | null {
  if (item.returnMethod === "DELIVERY" && item.asReceptionStatus === "AWAITING_SHIPMENT" && item.shipmentId === null) {
    return "배송 등록 대기";
  }
  if (item.returnMethod === "DELIVERY" && item.shipmentStatus === "READY" && item.shipmentId !== null) {
    return "배송 준비 완료";
  }
  if (item.returnMethod === "DELIVERY" && item.shipmentStatus === "SHIPPING") return "배송 중";
  if (item.returnMethod === "DELIVERY" && item.shipmentStatus === "DELIVERED") return "배송 완료";
  if (item.returnMethod === "PICKUP" && item.asReceptionStatus === "AWAITING_PICKUP" && (item.shipmentId === null || item.shipmentStatus === "READY")) {
    return "방문 수령 대기";
  }
  if (item.returnMethod === "PICKUP" && item.shipmentStatus === "PICKED_UP") return "방문 수령 완료";
  return null;
}

function toRow(item: ShipmentManagementItem, no: number): ShipmentRow | null {
  const status = listStatus(item);
  if (status === null) {
    return null;
  }
  return {
    no,
    shipmentId: item.shipmentId,
    asReceptionId: item.asReceptionId,
    asId: item.receptionNumber,
    method: shipmentMethodLabel(item.returnMethod),
    receiver: item.customerName,
    phone: item.recipientPhone,
    carrier: item.returnMethod === "PICKUP" ? "-" : carrierLabel(item.courier, null),
    trackingNo: item.trackingNumber !== null && item.trackingNumber !== "" ? item.trackingNumber : "-",
    status,
    startedAt: formatShipmentTime(item.shippedAt),
  };
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
    <span className={cn((value === "배송 중" || value === "배송중") && "text-blue-600", (value === "배송 완료" || value === "배송완료" || value === "방문 수령 완료" || value === "수령완료") && "text-green-600")}>
      {value}
    </span>
  );
}

function CreateShipmentModal({
  initial,
  onClose,
  onRegistered,
}: {
  initial: CreateInitial | null;
  onClose: () => void;
  onRegistered: () => void;
}) {
  const [asReceptionId, setAsReceptionId] = useState<number | null>(initial?.asReceptionId ?? null);
  const [shipmentId, setShipmentId] = useState<number | null>(null);
  const [returnMethod, setReturnMethod] = useState<ShipmentReturnMethod | null>(initial?.returnMethod ?? null);
  const [asId, setAsId] = useState(initial?.receptionNumber ?? "");
  const [lookupQuery, setLookupQuery] = useState("");
  const [picking, setPicking] = useState(false);
  const [receiver, setReceiver] = useState(initial?.receiver ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [addressDetail, setAddressDetail] = useState(initial?.addressDetail ?? "");
  const [carrierCode, setCarrierCode] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pickup = returnMethod === "PICKUP";
  const deliveryReady = asReceptionId !== null && carrierCode !== "" && trackingNo.trim() !== "";

  async function register(startShipping: boolean) {
    if (asReceptionId === null || returnMethod === null) {
      setError("접수를 검색해서 선택해 주세요.");
      setNotice("");
      return;
    }
    if (!pickup && (carrierCode === "" || trackingNo.trim() === "")) {
      setError("택배사와 운송장번호를 입력해 주세요.");
      setNotice("");
      return;
    }
    setSubmitting(true);
    try {
      if (pickup) {
        await createPickup(asReceptionId);
        setNotice("방문 수령을 등록했습니다.");
      } else if (startShipping) {
        // 이미 등록된 배송은 다시 만들지 않고 배송 시작만 한다.
        let id = shipmentId;
        if (id === null) {
          const existingShipment = await getShipmentByReception(asReceptionId);
          id = existingShipment.id;
        }
        setShipmentId(id);
        await markShipmentShipping(id);
        setNotice("배송을 시작했습니다.");
      } else {
        const created = await createShipment({
          asReceptionId,
          courierCode: carrierCode,
          trackingNumber: trackingNo.trim(),
        });
        setShipmentId(created.id);
        setNotice("운송장번호를 등록했습니다.");
      }
      setError("");
      onRegistered();
    } catch (caught: unknown) {
      setNotice("");
      setError(caught instanceof Error ? caught.message : "배송을 등록하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
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
            <TextField value={asId} onChange={setAsId} placeholder="AS-2026-0000" readOnly className="min-w-0 flex-1" />
            <Button variant="outline" className="shrink-0" onClick={() => setPicking(true)}>검색</Button>
          </div>
        </div>
        <TextField label="고객이름" value={receiver} onChange={setReceiver} readOnly />
        <TextField label="연락처" value={phone} onChange={setPhone} placeholder="010-0000-0000" readOnly />
        <TextField label="기본 주소" value={address} onChange={setAddress} placeholder="도로명 주소" readOnly />
        <TextField label="상세 주소" value={addressDetail} onChange={setAddressDetail} placeholder="동, 호수" readOnly />
        {!pickup && (
          <>
            <label className="block text-sm">
              <FieldLabel>택배사</FieldLabel>
              <SelectBox
                className="w-full"
                value={carrierCode}
                onChange={setCarrierCode}
                options={[
                  { value: "", label: "택배사 선택" },
                  ...sweetTrackerCarriers.map((item) => ({ value: item.code, label: item.name })),
                ]}
              />
            </label>
            <TextField label="운송장번호" value={trackingNo} onChange={setTrackingNo} placeholder="운송장번호" />
          </>
        )}
      </div>
      {error !== "" && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
      {notice !== "" && <div className="mt-3"><Notice>{notice}</Notice></div>}
      <div className="mt-4 flex justify-end gap-2">
        {pickup ? (
          <Button disabled={submitting || asReceptionId === null} onClick={() => void register(false)}>방문 수령 등록</Button>
        ) : (
          <>
            <Button variant="outline" disabled={submitting} onClick={() => void register(false)}>운송장 등록</Button>
            <Button disabled={submitting || !deliveryReady} onClick={() => void register(true)}>배송 알림</Button>
          </>
        )}
      </div>
    </Modal>
    {picking && (
      <ReceptionPickModal
        query={lookupQuery}
        onQueryChange={setLookupQuery}
        onClose={() => setPicking(false)}
        onApply={(row) => {
          setAsReceptionId(row.id);
          setShipmentId(null);
          setReturnMethod(row.returnMethod);
          setAsId(row.receptionNumber);
          setReceiver(row.receiver);
          setPhone(row.phone);
          setAddress(row.address);
          setAddressDetail(row.addressDetail);
          setError("");
          setNotice("");
          setPicking(false);
        }}
      />
    )}
    </>
  );
}

function ReceptionPickModal({
  query,
  onQueryChange,
  onClose,
  onApply,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onApply: (row: {
    id: number;
    receptionNumber: string;
    returnMethod: ShipmentReturnMethod;
    receiver: string;
    phone: string;
    address: string;
    addressDetail: string;
  }) => void;
}) {
  const [rows, setRows] = useState<ReceptionPick[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [applying, setApplying] = useState(false);

  function applyRow(row: ReceptionPick) {
    if (applying) {
      return;
    }
    setSelected(row.id);
    const controller = new AbortController();
    setApplying(true);
    fetchReception(row.id, controller.signal)
      .then((detail) => {
        onApply({
          id: detail.id,
          receptionNumber: detail.receptionNumber,
          returnMethod: detail.returnMethod,
          receiver: detail.customer.name,
          phone: detail.customer.phone,
          address: detail.customer.basicAddress ?? "",
          addressDetail: detail.customer.detailAddress ?? "",
        });
      })
      .catch((caught: unknown) => {
        if (!isAbortError(caught)) {
          setError(caught instanceof Error ? caught.message : "접수 정보를 불러오지 못했습니다.");
        }
      })
      .finally(() => setApplying(false));
  }
  const columns: Column<ReceptionPick>[] = [
    { key: "id", header: "접수번호", className: "w-[1%] whitespace-nowrap pl-[38.5px]", render: (row) => row.receptionNumber },
    // 접수번호 왼쪽·상태 오른쪽은 고정. 가장 긴 값 기준으로 세 간격이 같도록 가운데 열만 밀어 둔다.
    { key: "customer", header: "고객명", className: "w-[1%] whitespace-nowrap pl-[41.37px]", render: (row) => row.customerName },
    { key: "phone", header: "연락처", className: "w-[1%] whitespace-nowrap pl-[41.36px]", render: (row) => row.phone },
    {
      key: "status",
      header: <span className="inline-block w-[52px] text-left">상태</span>,
      className: "whitespace-nowrap text-right pr-[38.5px]",
      render: (row) => <span className="inline-block w-[52px] text-left">{receptionStatusLabel(row.status)}</span>,
    },
  ];

  useEffect(() => {
    const controller = new AbortController();
    const request = { keyword: query.trim(), technicianId: null, page: 1, size: 50, sort: "createdAt,desc" } as const;
    // 접수 상태가 배송 대기여도 배송이 이미 있으면 등록 대상이 아니다.
    fetchReceptions({ ...request, status: "AWAITING_SHIPMENT" }, controller.signal)
      .then(async (delivery) => {
        const available = await Promise.all(delivery.items.map(async (item) => {
          const shipment = await fetchShipmentByReception(item.id, controller.signal);
          return shipment === null ? item : null;
        }));
        if (controller.signal.aborted) {
          return;
        }
        setRows(available.flatMap((item) => item === null ? [] : [{
          id: item.id,
          receptionNumber: item.receptionNumber,
          customerName: item.customerName,
          phone: item.customerPhone,
          status: item.receptionStatus,
        }]));
        setError("");
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) {
          return;
        }
        setRows([]);
        setError(caught instanceof Error ? caught.message : "접수 목록을 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [query]);

  return (
    <Modal title="배송 대기 A/S" className="max-w-[600px]" onClose={onClose}>
      <TextField value={query} onChange={onQueryChange} placeholder="접수번호, 고객명 검색" className="mb-3 w-full" />
      {error !== "" && <div className="mb-3"><Notice tone="error">{error}</Notice></div>}
      <div className="mb-3 flex justify-end">
        <Button
          disabled={applying}
          onClick={() => {
            const row = rows.find((item) => item.id === selected);
            if (row !== undefined) {
              applyRow(row);
            }
          }}
        >
          적용
        </Button>
      </div>
      <DataTable
        compact
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        selectedKey={selected === null ? undefined : String(selected)}
        onRowClick={applyRow}
        emptyText="배송 대기 접수가 없습니다."
      />
    </Modal>
  );
}

function ShipmentDetailModal({ shipmentId, onClose, onChanged }: { shipmentId: number; onClose: () => void; onChanged: () => void }) {
  const [detail, setDetail] = useState<ShipmentDetail | null>(null);
  const [carrierCode, setCarrierCode] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchShipmentDetail(shipmentId, controller.signal)
      .then((next) => {
        setDetail(next);
        setCarrierCode(next.courierCode ?? "");
        setTrackingNo(next.trackingNumber ?? "");
        setError("");
      })
      .catch((caught: unknown) => {
        if (!isAbortError(caught)) {
          setError(caught instanceof Error ? caught.message : "배송 상세를 불러오지 못했습니다.");
        }
      });
    return () => controller.abort();
  }, [shipmentId]);

  const visit = detail?.returnMethod === "PICKUP";
  const editable = detail?.status === "READY" && !visit;

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    try {
      await action();
      const next = await fetchShipmentDetail(shipmentId, new AbortController().signal);
      setDetail(next);
      setCarrierCode(next.courierCode ?? "");
      setTrackingNo(next.trackingNumber ?? "");
      setNotice(done);
      setError("");
      onChanged();
    } catch (caught: unknown) {
      setNotice("");
      setError(caught instanceof Error ? caught.message : "배송 상태를 변경하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="배송 상세" onClose={onClose}>
      {detail === null ? (
        <p className="text-sm text-neutral-500">{error === "" ? "불러오는 중" : error}</p>
      ) : (
        <div className="space-y-4">
          <TextField label="접수번호" value={detail.receptionNumber} onChange={() => undefined} readOnly />
          <TextField label="수령인" value={detail.recipientName} onChange={() => undefined} readOnly />
          {!visit && (
            <>
              <TextField label="기본 주소" value={detail.address ?? ""} onChange={() => undefined} readOnly />
              <TextField label="상세 주소" value={detail.addressDetail ?? ""} onChange={() => undefined} readOnly />
              {editable ? (
                <label className="block text-sm">
                  <FieldLabel>택배사</FieldLabel>
                  <SelectBox
                    className="w-full"
                    value={carrierCode}
                    onChange={setCarrierCode}
                    options={sweetTrackerCarriers.map((item) => ({ value: item.code, label: item.name }))}
                  />
                </label>
              ) : (
                <TextField label="택배사" value={carrierLabel(detail.courier, detail.courierCode)} onChange={() => undefined} readOnly />
              )}
            </>
          )}
          <label className="block text-sm">
            <FieldLabel>상태</FieldLabel>
            <div className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm">
              <StatusLabel value={shipmentStatusLabel(detail.status, detail.returnMethod)} />
            </div>
          </label>
          {!visit && (
            <>
              <TextField label="운송장번호" value={trackingNo} onChange={setTrackingNo} readOnly={!editable} />
              <ShipmentHistory detail={detail} />
            </>
          )}
        </div>
      )}
      {detail !== null && error !== "" && <div className="mt-3"><Notice tone="error">{error}</Notice></div>}
      {notice !== "" && <div className="mt-3"><Notice>{notice}</Notice></div>}
      {detail !== null && (
        <div className="mt-4 flex justify-end gap-2">
          {!visit && !editable && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void run(() => refreshShipmentTracking(shipmentId), "배송 이력을 갱신했습니다.")}
            >
              배송 조회
            </Button>
          )}
          {editable && (
            <Button
              variant="outline"
              disabled={busy || carrierCode === "" || trackingNo.trim() === ""}
              onClick={() => void run(
                () => updateShipmentTracking(shipmentId, carrierCode, trackingNo.trim()).then(() => undefined),
                "운송장번호를 수정했습니다.",
              )}
            >
              운송장 수정
            </Button>
          )}
          {visit ? (
            <Button
              disabled={busy || detail.status !== "READY"}
              onClick={() => void run(() => markShipmentPickedUp(shipmentId).then(() => undefined), "수령 완료로 처리했습니다.")}
            >
              수령 완료
            </Button>
          ) : !editable && (
            <Button
              disabled={busy || detail.status !== "SHIPPING"}
              onClick={() => void run(() => markShipmentDelivered(shipmentId).then(() => undefined), "배송 완료로 처리했습니다.")}
            >
              배송 완료
            </Button>
          )}
        </div>
      )}
    </Modal>
  );
}

function ShipmentHistory({ detail }: { detail: ShipmentDetail }) {
  return (
    <div className="rounded-lg border border-neutral-300 bg-white px-4 py-3">
      <FieldLabel>배송 이력</FieldLabel>
      {detail.events.length === 0 ? (
        <p className="text-sm text-neutral-500">배송 이력이 없습니다.</p>
      ) : (
        <ol>
          {detail.events.map((item, index) => {
            const last = index === detail.events.length - 1;
            const title = item.description !== null && item.description.trim() !== "" ? item.description : shipmentEventLabel(item.status);
            return (
              <li key={item.id} className="flex gap-3">
                <div className="flex w-4 flex-col items-center">
                  <span className="text-sm font-semibold leading-5 text-neutral-900">{index + 1}</span>
                  {!last && <span className="mt-1 w-px flex-1 bg-neutral-300" />}
                </div>
                <div className={cn("min-w-0", last ? "pb-0" : "pb-4")}>
                  <p className="text-sm font-semibold leading-5 text-neutral-900">{title}</p>
                  <p className="mt-1 text-xs text-neutral-500">{formatShipmentTime(item.occurredAt)}</p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function formatShipmentTime(value: string | null): string {
  if (value === null || value === "") {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
