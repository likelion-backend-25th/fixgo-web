import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { FieldLabel, SelectBox, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Notice } from "@/components/ui/Panel";
import { Pagination } from "@/components/ui/Pagination";
import { fetchReception, fetchReceptions, receptionStatusLabel } from "@/lib/asReceptionApi";
import { isAbortError } from "@/lib/apiClient";
import { useSessionStore } from "@/stores/useSessionStore";
import { cn } from "@/lib/cn";
import { createPickup, createShipment, fetchShipmentByReception, fetchShipmentDetail, fetchShipmentManagement, getShipmentByReception, markShipmentDelivered, markShipmentPickedUp, markShipmentShipping, refreshShipmentTracking, shipmentEventLabel, shipmentMethodLabel, shipmentStatusClass, shipmentStatusLabel, updateShipmentTracking, } from "@/lib/shipmentApi";
import { carrierLabel, sweetTrackerCarriers } from "@/lib/sweetTrackerCarriers";
const statusFilters = [
    { value: "전체", label: "상태 전체" },
    { value: "배송 등록 대기", label: "배송 등록 대기" },
    { value: "배송 준비 완료", label: "배송 준비 완료" },
    { value: "배송 중", label: "배송 중" },
    { value: "배송 완료", label: "배송 완료" },
    { value: "방문 수령 대기", label: "방문 수령 대기" },
    { value: "방문 수령 완료", label: "방문 수령 완료" },
];
const pageSize = 20;
export function ShipmentListPage() {
    const canManage = useSessionStore((state) => state.user?.role !== "TECHNICIAN");
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("전체");
    const [method, setMethod] = useState("전체");
    const [page, setPage] = useState(1);
    const [pageCount, setPageCount] = useState(1);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [reloadKey, setReloadKey] = useState(0);
    const [selectedId, setSelectedId] = useState(null);
    const [infoRow, setInfoRow] = useState(null);
    const [creating, setCreating] = useState(false);
    const [createInitial, setCreateInitial] = useState(null);
    const [busyId, setBusyId] = useState(null);
    const [actionNotice, setActionNotice] = useState("");
    const [actionError, setActionError] = useState("");
    const [counts, setCounts] = useState({ wait: 0, ing: 0, done: 0, visit: 0 });
    async function runRowAction(row) {
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
            }
            catch (caught) {
                if (!isAbortError(caught)) {
                    setActionError(caught instanceof Error ? caught.message : "접수 정보를 불러오지 못했습니다.");
                }
            }
            finally {
                setBusyId(null);
            }
            return;
        }
        setBusyId(row.asReceptionId);
        try {
            if (row.status === "배송 준비 완료" && row.shipmentId !== null) {
                await markShipmentShipping(row.shipmentId);
                setActionNotice("배송을 시작했습니다.");
            }
            else if (row.status === "배송 중" && row.method === "택배" && row.shipmentId !== null) {
                await markShipmentDelivered(row.shipmentId);
                setActionNotice("배송 완료로 처리했습니다.");
            }
            else if (row.status === "방문 수령 대기" && row.shipmentId === null) {
                await createPickup(row.asReceptionId);
                setActionNotice("방문 수령을 등록했습니다.");
            }
            else if (row.status === "방문 수령 대기" && row.shipmentId !== null) {
                await markShipmentPickedUp(row.shipmentId);
                setActionNotice("수령 완료로 처리했습니다.");
            }
            setReloadKey((value) => value + 1);
        }
        catch (caught) {
            setActionError(caught instanceof Error ? caught.message : "배송 상태를 변경하지 못했습니다.");
        }
        finally {
            setBusyId(null);
        }
    }
    const columns = [
        { key: "as", header: "접수번호", render: (row) => row.asId },
        { key: "method", header: "수령 방법", render: (row) => row.method },
        { key: "receiver", header: "수령인", render: (row) => row.receiver },
        { key: "phone", header: "연락처", render: (row) => row.phone },
        { key: "carrier", header: "택배사", render: (row) => row.carrier },
        { key: "tracking", header: "운송장번호", render: (row) => row.trackingNo },
        { key: "status", header: "상태", render: (row) => _jsx(StatusLabel, { value: row.status }) },
        { key: "started", header: "발송 시각", render: (row) => row.startedAt },
        {
            key: "detail",
            header: "",
            render: (row) => {
                if (!canManage) {
                    return null;
                }
                const label = rowActionLabel(row);
                if (label === "배송 알림" || label === "배송 조회" || label === "상세 보기") {
                    return null;
                }
                return (_jsx("div", { className: "flex justify-end", onClick: (event) => event.stopPropagation(), children: _jsx(Button, { variant: label === "배송 완료" || label === "수령 완료" ? "outline" : "primary", className: shipmentActionClass(label), disabled: busyId === row.asReceptionId, onClick: () => void runRowAction(row), children: label }) }));
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
            setRows(result.items.flatMap((item) => {
                const row = toRow(item);
                return row === null ? [] : [row];
            }));
            setPageCount(Math.max(1, result.totalPages));
            setLoadError("");
        })
            .catch((error) => {
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
        const empty = { keyword: "", returnMethod: "ALL", page: 1, size: 1 };
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
            .catch((error) => {
            if (!isAbortError(error)) {
                setCounts({ wait: 0, ing: 0, done: 0, visit: 0 });
            }
        });
        return () => controller.abort();
    }, [reloadKey]);
    return (_jsxs("div", { children: [_jsxs("div", { className: "mb-4 grid gap-3 sm:grid-cols-4", children: [_jsx(Stat, { label: "\uBC30\uC1A1 \uB300\uAE30", value: `${counts.wait}건` }), _jsx(Stat, { label: "\uBC30\uC1A1\uC911", value: `${counts.ing}건` }), _jsx(Stat, { label: "\uBC30\uC1A1 \uC644\uB8CC", value: `${counts.done}건` }), _jsx(Stat, { label: "\uBC29\uBB38 \uC218\uB839", value: `${counts.visit}건` })] }), _jsxs("div", { className: "mb-4 flex flex-wrap items-center gap-2", children: [_jsx(TextField, { value: query, onChange: (value) => { setQuery(value); setPage(1); }, placeholder: "\uC811\uC218\uBC88\uD638, \uC218\uB839\uC778, \uC6B4\uC1A1\uC7A5\uBC88\uD638 \uAC80\uC0C9", className: "w-72" }), _jsx(SelectBox, { value: status, onChange: (value) => { setStatus(value); setPage(1); }, options: statusFilters }), _jsx(SelectBox, { value: method, onChange: (value) => { setMethod(value); setPage(1); }, options: [{ value: "전체", label: "수령 방법 전체" }, { value: "택배", label: "택배" }, { value: "방문 수령", label: "방문 수령" }] }), canManage && _jsx(Button, { className: "ml-auto", onClick: () => { setCreateInitial(null); setCreating(true); }, children: "\uB4F1\uB85D" })] }), loadError !== "" && _jsx("div", { className: "mb-3", children: _jsx(Notice, { tone: "error", children: loadError }) }), actionError !== "" && _jsx("div", { className: "mb-3", children: _jsx(Notice, { tone: "error", children: actionError }) }), actionNotice !== "" && _jsx("div", { className: "mb-3", children: _jsx(Notice, { children: actionNotice }) }), _jsx(DataTable, { columns: columns, rows: rows, rowKey: (row) => String(row.asReceptionId), onRowClick: (row) => {
                        if (row.method === "택배" && row.shipmentId !== null) {
                            setInfoRow(null);
                            setSelectedId(row.shipmentId);
                            return;
                        }
                        setSelectedId(null);
                        setInfoRow(row);
                    }, selectedKey: selectedId === null ? undefined : String(rows.find((row) => row.shipmentId === selectedId)?.asReceptionId ?? ""), emptyText: loading ? "불러오는 중" : "배송 내역이 없습니다." }), _jsx(Pagination, { page: page, pageCount: pageCount, onPageChange: setPage }), creating && (_jsx(CreateShipmentModal, { initial: createInitial, onClose: () => {
                    setCreating(false);
                    setCreateInitial(null);
                }, onRegistered: () => setReloadKey((value) => value + 1) })), selectedId !== null && (_jsx(ShipmentDetailModal, { shipmentId: selectedId, readOnly: !canManage, onClose: () => setSelectedId(null), onChanged: () => setReloadKey((value) => value + 1) })), infoRow !== null && (_jsx(ShipmentRowInfoModal, { row: infoRow, canEdit: canManage, onClose: () => setInfoRow(null), onChanged: () => setReloadKey((value) => value + 1) }))] }));
}
function toManagementStatus(value) {
    if (value === "배송 등록 대기")
        return "AWAITING_SHIPMENT";
    if (value === "배송 준비 완료")
        return "READY";
    if (value === "배송 중")
        return "SHIPPING";
    if (value === "배송 완료")
        return "DELIVERED";
    if (value === "방문 수령 대기")
        return "AWAITING_PICKUP";
    if (value === "방문 수령 완료")
        return "PICKED_UP";
    return "ALL";
}
function toManagementMethod(value) {
    if (value === "택배")
        return "DELIVERY";
    if (value === "방문 수령")
        return "PICKUP";
    return "ALL";
}
function rowActionLabel(row) {
    if (row.status === "배송 등록 대기")
        return "배송 등록";
    if (row.status === "배송 준비 완료")
        return "배송 알림";
    if (row.status === "배송 중" && row.method === "택배")
        return "배송 완료";
    if (row.status === "배송 완료")
        return "상세 보기";
    if (row.status === "방문 수령 대기")
        return row.shipmentId === null ? "수령 등록" : "수령 완료";
    return "상세 보기";
}
function shipmentActionClass(label) {
    if (label === "배송 알림")
        return "bg-[#005A9C] text-white shadow-none hover:bg-[#004E8A]";
    if (label === "수령 완료")
        return "border border-[#60C1E5] bg-white text-[#60C1E5] shadow-none hover:bg-[#F3FBFD]";
    if (label === "배송 조회")
        return "bg-[#A0E0EF] text-[#005A9C] shadow-none hover:bg-[#8AD4E6]";
    if (label === "상세 보기")
        return "bg-[#F1F5F9] text-[#475569] shadow-none hover:bg-[#E2E8F0]";
    return undefined;
}
function listStatus(item) {
    if (item.returnMethod === "DELIVERY" && item.asReceptionStatus === "AWAITING_SHIPMENT" && item.shipmentId === null) {
        return "배송 등록 대기";
    }
    if (item.returnMethod === "DELIVERY" && item.shipmentStatus === "READY" && item.shipmentId !== null) {
        return "배송 준비 완료";
    }
    if (item.returnMethod === "DELIVERY" && item.shipmentStatus === "SHIPPING")
        return "배송 중";
    if (item.returnMethod === "DELIVERY" && item.shipmentStatus === "DELIVERED")
        return "배송 완료";
    if (item.returnMethod === "PICKUP" && item.asReceptionStatus === "AWAITING_PICKUP" && (item.shipmentId === null || item.shipmentStatus === "READY")) {
        return "방문 수령 대기";
    }
    if (item.returnMethod === "PICKUP" && item.shipmentStatus === "PICKED_UP")
        return "방문 수령 완료";
    return null;
}
function toRow(item) {
    const status = listStatus(item);
    if (status === null) {
        return null;
    }
    return {
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
function Stat({ label, value }) {
    return (_jsxs("div", { className: "rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", children: [_jsx("p", { className: "text-sm text-neutral-500", children: label }), _jsx("p", { className: "mt-1 text-2xl font-semibold text-blue-600", children: value })] }));
}
function StatusLabel({ value }) {
    return (_jsx("span", { className: shipmentStatusClass(value), children: value }));
}
function CreateShipmentModal({ initial, onClose, onRegistered, }) {
    const [asReceptionId, setAsReceptionId] = useState(initial?.asReceptionId ?? null);
    const [shipmentId, setShipmentId] = useState(null);
    const [returnMethod, setReturnMethod] = useState(initial?.returnMethod ?? null);
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
    async function register(startShipping) {
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
            }
            else if (startShipping) {
                // 이미 등록된 배송은 다시 만들지 않고 배송 시작만 한다.
                let id = shipmentId;
                if (id === null) {
                    const existingShipment = await getShipmentByReception(asReceptionId);
                    id = existingShipment.id;
                }
                setShipmentId(id);
                await markShipmentShipping(id);
                setNotice("배송을 시작했습니다.");
            }
            else {
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
        }
        catch (caught) {
            setNotice("");
            setError(caught instanceof Error ? caught.message : "배송을 등록하지 못했습니다.");
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsxs(_Fragment, { children: [_jsxs(Modal, { title: "\uBC30\uC1A1 \uB4F1\uB85D", onClose: () => {
                    if (picking) {
                        return;
                    }
                    onClose();
                }, children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx(FieldLabel, { children: "\uC811\uC218\uBC88\uD638" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(TextField, { value: asId, onChange: setAsId, placeholder: "AS-2026-0000", readOnly: true, className: "min-w-0 flex-1" }), _jsx(Button, { variant: "outline", className: "shrink-0", onClick: () => setPicking(true), children: "\uAC80\uC0C9" })] })] }), _jsx(TextField, { label: "\uACE0\uAC1D\uC774\uB984", value: receiver, onChange: setReceiver, readOnly: true }), _jsx(TextField, { label: "\uC5F0\uB77D\uCC98", value: phone, onChange: setPhone, placeholder: "010-0000-0000", readOnly: true }), _jsx(TextField, { label: "\uAE30\uBCF8 \uC8FC\uC18C", value: address, onChange: setAddress, placeholder: "\uB3C4\uB85C\uBA85 \uC8FC\uC18C", readOnly: true }), _jsx(TextField, { label: "\uC0C1\uC138 \uC8FC\uC18C", value: addressDetail, onChange: setAddressDetail, placeholder: "\uB3D9, \uD638\uC218", readOnly: true }), !pickup && (_jsxs(_Fragment, { children: [_jsxs("label", { className: "block text-sm", children: [_jsx(FieldLabel, { children: "\uD0DD\uBC30\uC0AC" }), _jsx(SelectBox, { className: "w-full", value: carrierCode, onChange: setCarrierCode, options: [
                                                    { value: "", label: "택배사 선택" },
                                                    ...sweetTrackerCarriers.map((item) => ({ value: item.code, label: item.name })),
                                                ] })] }), _jsx(TextField, { label: "\uC6B4\uC1A1\uC7A5\uBC88\uD638", value: trackingNo, onChange: setTrackingNo, placeholder: "\uC6B4\uC1A1\uC7A5\uBC88\uD638" })] }))] }), error !== "" && _jsx("div", { className: "mt-3", children: _jsx(Notice, { tone: "error", children: error }) }), notice !== "" && _jsx("div", { className: "mt-3", children: _jsx(Notice, { children: notice }) }), _jsx("div", { className: "mt-4 flex justify-end gap-2", children: pickup ? (_jsx(Button, { disabled: submitting || asReceptionId === null, onClick: () => void register(false), children: "\uBC29\uBB38 \uC218\uB839 \uB4F1\uB85D" })) : (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "outline", disabled: submitting, onClick: () => void register(false), children: "\uC6B4\uC1A1\uC7A5 \uB4F1\uB85D" }), _jsx(Button, { className: shipmentActionClass("배송 알림"), disabled: submitting || !deliveryReady, onClick: () => void register(true), children: "\uBC30\uC1A1 \uC54C\uB9BC" })] })) })] }), picking && (_jsx(ReceptionPickModal, { query: lookupQuery, onQueryChange: setLookupQuery, onClose: () => setPicking(false), onApply: (row) => {
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
                } }))] }));
}
function ReceptionPickModal({ query, onQueryChange, onClose, onApply, }) {
    const [rows, setRows] = useState([]);
    const [selected, setSelected] = useState(null);
    const [error, setError] = useState("");
    const [applying, setApplying] = useState(false);
    function applyRow(row) {
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
            .catch((caught) => {
            if (!isAbortError(caught)) {
                setError(caught instanceof Error ? caught.message : "접수 정보를 불러오지 못했습니다.");
            }
        })
            .finally(() => setApplying(false));
    }
    const columns = [
        { key: "id", header: "접수번호", className: "w-[1%] whitespace-nowrap pl-[38.5px]", render: (row) => row.receptionNumber },
        // 접수번호 왼쪽·상태 오른쪽은 고정. 가장 긴 값 기준으로 세 간격이 같도록 가운데 열만 밀어 둔다.
        { key: "customer", header: "고객명", className: "w-[1%] whitespace-nowrap pl-[41.37px]", render: (row) => row.customerName },
        { key: "phone", header: "연락처", className: "w-[1%] whitespace-nowrap pl-[41.36px]", render: (row) => row.phone },
        {
            key: "status",
            header: _jsx("span", { className: "inline-block w-[52px] text-left", children: "\uC0C1\uD0DC" }),
            className: "whitespace-nowrap text-right pr-[38.5px]",
            render: (row) => _jsx("span", { className: "inline-block w-[52px] text-left", children: receptionStatusLabel(row.status) }),
        },
    ];
    useEffect(() => {
        const controller = new AbortController();
        const request = { keyword: query.trim(), technicianId: null, page: 1, size: 50, sort: "createdAt,desc" };
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
            .catch((caught) => {
            if (isAbortError(caught)) {
                return;
            }
            setRows([]);
            setError(caught instanceof Error ? caught.message : "접수 목록을 불러오지 못했습니다.");
        });
        return () => controller.abort();
    }, [query]);
    return (_jsxs(Modal, { title: "\uBC30\uC1A1 \uB300\uAE30 A/S", className: "max-w-[600px]", onClose: onClose, children: [_jsx(TextField, { value: query, onChange: onQueryChange, placeholder: "\uC811\uC218\uBC88\uD638, \uACE0\uAC1D\uBA85 \uAC80\uC0C9", className: "mb-3 w-full" }), error !== "" && _jsx("div", { className: "mb-3", children: _jsx(Notice, { tone: "error", children: error }) }), _jsx("div", { className: "mb-3 flex justify-end", children: _jsx(Button, { disabled: applying, onClick: () => {
                        const row = rows.find((item) => item.id === selected);
                        if (row !== undefined) {
                            applyRow(row);
                        }
                    }, children: "\uC801\uC6A9" }) }), _jsx(DataTable, { compact: true, columns: columns, rows: rows, rowKey: (row) => String(row.id), selectedKey: selected === null ? undefined : String(selected), onRowClick: applyRow, emptyText: "\uBC30\uC1A1 \uB300\uAE30 \uC811\uC218\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." })] }));
}
function ShipmentDetailModal({ shipmentId, readOnly, onClose, onChanged, }) {
    const [detail, setDetail] = useState(null);
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
            .catch((caught) => {
            if (!isAbortError(caught)) {
                setError(caught instanceof Error ? caught.message : "배송 상세를 불러오지 못했습니다.");
            }
        });
        return () => controller.abort();
    }, [shipmentId]);
    const visit = detail?.returnMethod === "PICKUP";
    const editable = !readOnly && detail?.status === "READY" && !visit;
    async function run(action, done) {
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
        }
        catch (caught) {
            setNotice("");
            setError(caught instanceof Error ? caught.message : "배송 상태를 변경하지 못했습니다.");
        }
        finally {
            setBusy(false);
        }
    }
    return (_jsxs(Modal, { title: "\uBC30\uC1A1 \uC0C1\uC138", onClose: onClose, children: [detail === null ? (_jsx("p", { className: "text-sm text-neutral-500", children: error === "" ? "불러오는 중" : error })) : (_jsxs("div", { className: "space-y-4", children: [_jsx(TextField, { label: "\uC811\uC218\uBC88\uD638", value: detail.receptionNumber, onChange: () => undefined, readOnly: true }), _jsx(TextField, { label: "\uC218\uB839\uC778", value: detail.recipientName, onChange: () => undefined, readOnly: true }), !visit && (_jsxs(_Fragment, { children: [_jsx(TextField, { label: "\uAE30\uBCF8 \uC8FC\uC18C", value: detail.address ?? "", onChange: () => undefined, readOnly: true }), _jsx(TextField, { label: "\uC0C1\uC138 \uC8FC\uC18C", value: detail.addressDetail ?? "", onChange: () => undefined, readOnly: true }), editable ? (_jsxs("label", { className: "block text-sm", children: [_jsx(FieldLabel, { children: "\uD0DD\uBC30\uC0AC" }), _jsx(SelectBox, { className: "w-full", value: carrierCode, onChange: setCarrierCode, options: sweetTrackerCarriers.map((item) => ({ value: item.code, label: item.name })) })] })) : (_jsx(TextField, { label: "\uD0DD\uBC30\uC0AC", value: carrierLabel(detail.courier, detail.courierCode), onChange: () => undefined, readOnly: true }))] })), _jsxs("label", { className: "block text-sm", children: [_jsx(FieldLabel, { children: "\uC0C1\uD0DC" }), _jsx("div", { className: "rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm", children: _jsx(StatusLabel, { value: shipmentStatusLabel(detail.status, detail.returnMethod) }) })] }), visit && _jsx(TextField, { label: "\uBC29\uBB38 \uC218\uB839 \uC77C\uC2DC", value: formatShipmentTime(detail.completedAt), onChange: () => undefined, readOnly: true }), !visit && (_jsxs(_Fragment, { children: [_jsx(TextField, { label: "\uC6B4\uC1A1\uC7A5\uBC88\uD638", value: trackingNo, onChange: setTrackingNo, readOnly: !editable }), _jsx(ShipmentHistory, { detail: detail })] }))] })), detail !== null && error !== "" && _jsx("div", { className: "mt-3", children: _jsx(Notice, { tone: "error", children: error }) }), notice !== "" && _jsx("div", { className: "mt-3", children: _jsx(Notice, { children: notice }) }), detail !== null && !readOnly && (_jsxs("div", { className: "mt-4 flex justify-end gap-2", children: [!visit && editable && (_jsx(Button, { className: shipmentActionClass("배송 알림"), disabled: busy, onClick: () => void run(() => markShipmentShipping(shipmentId).then(() => undefined), "배송을 시작했습니다."), children: "\uBC30\uC1A1 \uC54C\uB9BC" })), !visit && !editable && (_jsx(Button, { className: detail.status === "SHIPPING" ? "bg-[#005A9C] text-white shadow-none hover:bg-[#004E8A]" : shipmentActionClass("배송 조회"), disabled: busy, onClick: () => void run(() => refreshShipmentTracking(shipmentId), "배송 이력을 갱신했습니다."), children: "\uBC30\uC1A1 \uC870\uD68C" })), editable && (_jsx(Button, { variant: "outline", disabled: busy || carrierCode === "" || trackingNo.trim() === "", onClick: () => void run(() => updateShipmentTracking(shipmentId, carrierCode, trackingNo.trim()).then(() => undefined), "운송장번호를 수정했습니다."), children: "\uC6B4\uC1A1\uC7A5 \uC218\uC815" })), visit ? (_jsx(Button, { className: shipmentActionClass("수령 완료"), disabled: busy || detail.status !== "READY", onClick: () => void run(() => markShipmentPickedUp(shipmentId).then(() => undefined), "수령 완료로 처리했습니다."), children: "\uC218\uB839 \uC644\uB8CC" })) : !editable && (_jsx(Button, { variant: detail.status === "SHIPPING" ? "outline" : "primary", disabled: busy || detail.status !== "SHIPPING", onClick: () => void run(() => markShipmentDelivered(shipmentId).then(() => undefined), "배송 완료로 처리했습니다."), children: "\uBC30\uC1A1 \uC644\uB8CC" }))] }))] }));
}
function ShipmentHistory({ detail }) {
    return (_jsxs("div", { className: "rounded-lg border border-neutral-300 bg-white px-4 py-3", children: [_jsx(FieldLabel, { children: "\uBC30\uC1A1 \uC774\uB825" }), detail.events.length === 0 ? (_jsx("p", { className: "text-sm text-neutral-500", children: "\uBC30\uC1A1 \uC774\uB825\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." })) : (_jsx("ol", { children: detail.events.map((item, index) => {
                    const last = index === detail.events.length - 1;
                    const title = item.description !== null && item.description.trim() !== "" ? item.description : shipmentEventLabel(item.status);
                    return (_jsxs("li", { className: "flex gap-3", children: [_jsxs("div", { className: "flex w-4 flex-col items-center", children: [_jsx("span", { className: "text-sm font-semibold leading-5 text-neutral-900", children: index + 1 }), !last && _jsx("span", { className: "mt-1 w-px flex-1 bg-neutral-300" })] }), _jsxs("div", { className: cn("min-w-0", last ? "pb-0" : "pb-4"), children: [_jsx("p", { className: "text-sm font-semibold leading-5 text-neutral-900", children: title }), _jsx("p", { className: "mt-1 text-xs text-neutral-500", children: formatShipmentTime(item.occurredAt) })] })] }, item.id));
                }) }))] }));
}
function ShipmentRowInfoModal({ row, canEdit, onClose, onChanged }) {
    const delivery = row.method === "택배";
    const showPickedUpAt = row.method === "방문 수령" && row.status === "방문 수령 완료";
    const editable = canEdit && delivery && row.shipmentId !== null;
    const [status, setStatus] = useState(row.status);
    const [pickedUpAt, setPickedUpAt] = useState(null);
    const [carrierCode, setCarrierCode] = useState("");
    const [trackingNo, setTrackingNo] = useState(row.trackingNo === "-" ? "" : row.trackingNo);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        const timeRequest = showPickedUpAt && row.shipmentId !== null
            ? fetchShipmentDetail(row.shipmentId, controller.signal).then((detail) => detail.completedAt)
            : Promise.resolve(null);
        const shipmentRequest = delivery && row.shipmentId !== null
            ? fetchShipmentDetail(row.shipmentId, controller.signal)
            : Promise.resolve(null);
        Promise.all([timeRequest, shipmentRequest])
            .then(([completedAt, shipment]) => {
            if (controller.signal.aborted) {
                return;
            }
            setPickedUpAt(completedAt);
            if (shipment !== null) {
                setCarrierCode(shipment.courierCode ?? "");
                setTrackingNo(shipment.trackingNumber ?? "");
            }
            setError("");
        })
            .catch((caught) => {
            if (!isAbortError(caught)) {
                setError(caught instanceof Error ? caught.message : "배송 정보를 불러오지 못했습니다.");
            }
        })
            .finally(() => {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        });
        return () => controller.abort();
    }, [delivery, row, showPickedUpAt]);
    const canCompletePickup = canEdit && row.method === "방문 수령" && status === "방문 수령 대기";
    async function completePickup() {
        if (!canCompletePickup || saving) {
            return;
        }
        setSaving(true);
        setNotice("");
        setError("");
        try {
            const shipmentId = row.shipmentId ?? (await createPickup(row.asReceptionId)).id;
            const completed = await markShipmentPickedUp(shipmentId);
            setStatus("방문 수령 완료");
            setPickedUpAt(completed.completedAt);
            setNotice("수령 완료로 처리했습니다.");
            onChanged();
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : "수령 완료로 처리하지 못했습니다.");
        }
        finally {
            setSaving(false);
        }
    }
    async function saveTracking() {
        if (!editable || row.shipmentId === null || saving) {
            return;
        }
        setSaving(true);
        setNotice("");
        setError("");
        try {
            await updateShipmentTracking(row.shipmentId, carrierCode, trackingNo.trim());
            setNotice("운송장 정보를 수정했습니다.");
            onChanged();
        }
        catch (caught) {
            setError(caught instanceof Error ? caught.message : "운송장 정보를 수정하지 못했습니다.");
        }
        finally {
            setSaving(false);
        }
    }
    return (_jsxs(Modal, { title: "배송 상세", onClose: onClose, children: [loading ? (_jsx("p", { className: "text-sm text-neutral-500", children: error === "" ? "불러오는 중" : error })) : (_jsxs("div", { className: "space-y-4", children: [_jsx(TextField, { label: "접수번호", value: row.asId, onChange: () => undefined, readOnly: true }), _jsx(TextField, { label: "수령인", value: row.receiver, onChange: () => undefined, readOnly: true }), _jsx(TextField, { label: "수령 방법", value: row.method, onChange: () => undefined, readOnly: true }), delivery && editable && (_jsxs(_Fragment, { children: [_jsxs("label", { className: "block text-sm", children: [_jsx(FieldLabel, { children: "택배사" }), _jsx(SelectBox, { className: "w-full", value: carrierCode, onChange: setCarrierCode, options: [{ value: "", label: "택배사 선택" }, ...sweetTrackerCarriers.map((item) => ({ value: item.code, label: item.name }))] })] }), _jsx(TextField, { label: "운송장번호", value: trackingNo, onChange: setTrackingNo, placeholder: "운송장번호" })] })), delivery && !editable && (_jsxs(_Fragment, { children: [_jsx(TextField, { label: "택배사", value: row.carrier, onChange: () => undefined, readOnly: true }), _jsx(TextField, { label: "운송장번호", value: row.trackingNo, onChange: () => undefined, readOnly: true })] })), _jsxs("label", { className: "block text-sm", children: [_jsx(FieldLabel, { children: "상태" }), _jsx("div", { className: "rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm", children: _jsx(StatusLabel, { value: status }) })] }), row.method === "방문 수령" && status === "방문 수령 완료" && (_jsx(TextField, { label: "방문 수령 일시", value: formatShipmentTime(pickedUpAt), onChange: () => undefined, readOnly: true })), editable && (_jsx("div", { className: "flex justify-end", children: _jsx(Button, { disabled: saving || carrierCode === "" || trackingNo.trim() === "", onClick: () => void saveTracking(), children: saving ? "저장 중…" : "저장" }) }))] })), !loading && notice !== "" && _jsx("div", { className: "mt-3", children: _jsx(Notice, { children: notice }) }), !loading && error !== "" && _jsx("div", { className: "mt-3", children: _jsx(Notice, { tone: "error", children: error }) }), canCompletePickup && !loading && (_jsx("div", { className: "mt-4 flex justify-end", children: _jsx(Button, { className: shipmentActionClass("수령 완료"), disabled: saving, onClick: () => void completePickup(), children: saving ? "처리 중…" : "수령 완료" }) }))] }));
}
function formatShipmentTime(value) {
    if (value === null || value === "") {
        return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
