import { isReceptionStatus } from "@/lib/asReceptionApi";
import { apiFetch, isId, isRecord, readErrorMessage } from "@/lib/apiClient";
const statuses = ["READY", "SHIPPING", "DELIVERED", "PICKED_UP"];
const methods = ["DELIVERY", "PICKUP"];
const eventStatuses = ["REGISTERED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED"];
export function shipmentStatusLabel(status, method) {
    if (status === "READY") {
        return method === "PICKUP" ? "미수령" : "배송대기";
    }
    if (status === "SHIPPING") {
        return "배송중";
    }
    if (status === "DELIVERED") {
        return "배송완료";
    }
    return "수령완료";
}
export function shipmentStatusClass(status) {
    return `inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${shipmentStatusTone(status)}`;
}
function shipmentStatusTone(status) {
    if (status === "배송 준비 완료") {
        return "bg-[#FFF1E0] text-[#E07A2F]";
    }
    if (status === "배송 중" || status === "배송중") {
        return "bg-[#E7F4FC] text-[#3B8FD6]";
    }
    if (status === "배송 완료" || status === "배송완료" || status === "방문 수령 완료" || status === "수령완료") {
        return "bg-[#E7F6EC] text-[#3D9A5F]";
    }
    return "bg-[#EEF2F6] text-[#64748B]";
}
export function shipmentEventLabel(status) {
    if (status === "REGISTERED")
        return "운송장 등록";
    if (status === "PICKED_UP")
        return "집화 완료";
    if (status === "IN_TRANSIT")
        return "배송중";
    if (status === "OUT_FOR_DELIVERY")
        return "배송 출발";
    return "배송완료";
}
export function shipmentMethodLabel(method) {
    return method === "PICKUP" ? "방문 수령" : "택배";
}
export async function createShipment(input) {
    const response = await apiFetch("/api/v1/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "배송을 등록하지 못했습니다."));
    }
    return parseShipment(await readJson(response));
}
export async function createPickup(asReceptionId) {
    const response = await apiFetch("/api/v1/shipments/pickups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asReceptionId }),
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "방문 수령을 등록하지 못했습니다."));
    }
    return parseShipment(await readJson(response));
}
// 접수에 배송이 없으면 400이다. 목록에서는 미등록으로 본다.
export async function fetchShipmentByReception(asReceptionId, signal) {
    const response = await apiFetch(`/api/v1/shipments/receptions/${asReceptionId}`, { signal });
    if (response.status === 400 || response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "배송 정보를 불러오지 못했습니다."));
    }
    return parseShipment(await readJson(response));
}
export async function fetchShipmentManagement(query, signal) {
    const params = new URLSearchParams();
    if (query.keyword !== "") {
        params.set("keyword", query.keyword);
    }
    params.set("status", query.status);
    params.set("returnMethod", query.returnMethod);
    params.set("page", String(query.page - 1));
    params.set("size", String(query.size));
    const response = await apiFetch(`/api/v1/shipments/list?${params.toString()}`, { signal });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "배송 목록을 불러오지 못했습니다."));
    }
    return parseManagementPage(await readJson(response));
}
export async function getShipmentByReception(asReceptionId) {
    const response = await apiFetch(`/api/v1/shipments/receptions/${asReceptionId}`);
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "배송 정보를 불러오지 못했습니다."));
    }
    return parseShipment(await readJson(response));
}
export async function fetchShipmentDetail(shipmentId, signal) {
    const response = await apiFetch(`/api/v1/shipments/${shipmentId}/details`, { signal });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "배송 상세를 불러오지 못했습니다."));
    }
    return parseDetail(await readJson(response));
}
export async function updateShipmentTracking(shipmentId, courierCode, trackingNumber) {
    const response = await apiFetch(`/api/v1/shipments/${shipmentId}/tracking-info`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courierCode, trackingNumber }),
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "운송장 정보를 수정하지 못했습니다."));
    }
    return parseShipment(await readJson(response));
}
export async function markShipmentShipping(shipmentId) {
    return patchShipment(shipmentId, "shipping", "배송을 시작하지 못했습니다.");
}
export async function markShipmentDelivered(shipmentId) {
    return patchShipment(shipmentId, "delivered", "배송 완료로 처리하지 못했습니다.");
}
export async function markShipmentPickedUp(shipmentId) {
    return patchShipment(shipmentId, "pickup", "수령 완료로 처리하지 못했습니다.");
}
export async function refreshShipmentTracking(shipmentId) {
    const response = await apiFetch(`/api/v1/shipments/${shipmentId}/tracking/refresh`, { method: "POST" });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "배송 조회에 실패했습니다."));
    }
}
async function patchShipment(shipmentId, action, fallback) {
    const response = await apiFetch(`/api/v1/shipments/${shipmentId}/${action}`, { method: "PATCH" });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, fallback));
    }
    return parseShipment(await readJson(response));
}
async function readJson(response) {
    try {
        return await response.json();
    }
    catch {
        throw new Error("배송 응답이 올바르지 않습니다.");
    }
}
function parseShipment(value) {
    if (!isRecord(value) || !isId(value.id) || !isId(value.asReceptionId) || typeof value.receptionNumber !== "string") {
        throw new Error("배송 응답이 올바르지 않습니다.");
    }
    if (!isMethod(value.returnMethod) || !isStatus(value.status)) {
        throw new Error("배송 응답이 올바르지 않습니다.");
    }
    return {
        id: value.id,
        asReceptionId: value.asReceptionId,
        receptionNumber: value.receptionNumber,
        recipientName: readText(value.recipientName),
        recipientPhone: readText(value.recipientPhone),
        returnMethod: value.returnMethod,
        courier: readNullableText(value.courier),
        courierCode: readNullableText(value.courierCode),
        trackingNumber: readNullableText(value.trackingNumber),
        status: value.status,
        shippedAt: readDateTime(value.shippedAt),
        completedAt: readDateTime(value.completedAt),
    };
}
function parseManagementPage(value) {
    if (!isRecord(value) || !Array.isArray(value.content) || !isCount(value.totalElements) || !isCount(value.totalPages) || !isCount(value.number) || !isCount(value.size)) {
        throw new Error("배송 목록 응답이 올바르지 않습니다.");
    }
    return {
        items: value.content.map(parseManagementItem),
        totalElements: value.totalElements,
        totalPages: value.totalPages,
        number: value.number,
        size: value.size,
    };
}
function parseManagementItem(value) {
    if (!isRecord(value) || !isId(value.asReceptionId) || typeof value.receptionNumber !== "string" || typeof value.customerName !== "string" || typeof value.recipientPhone !== "string") {
        throw new Error("배송 목록 응답이 올바르지 않습니다.");
    }
    if (!isMethod(value.returnMethod)
        || typeof value.asReceptionStatus !== "string"
        || !isReceptionStatus(value.asReceptionStatus)) {
        throw new Error("배송 목록 응답이 올바르지 않습니다.");
    }
    const shipmentId = value.shipmentId === null ? null : value.shipmentId;
    const shipmentStatus = value.shipmentStatus === null ? null : value.shipmentStatus;
    if ((shipmentId !== null && !isId(shipmentId)) || (shipmentStatus !== null && !isStatus(shipmentStatus))) {
        throw new Error("배송 목록 응답이 올바르지 않습니다.");
    }
    return {
        asReceptionId: value.asReceptionId,
        shipmentId,
        receptionNumber: value.receptionNumber,
        customerName: value.customerName,
        recipientPhone: value.recipientPhone,
        returnMethod: value.returnMethod,
        asReceptionStatus: value.asReceptionStatus,
        shipmentStatus,
        courier: readNullableText(value.courier),
        trackingNumber: readNullableText(value.trackingNumber),
        shippedAt: readDateTime(value.shippedAt),
    };
}
function isCount(value) {
    return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
function parseDetail(value) {
    const shipment = parseShipment(value);
    if (!isRecord(value) || !Array.isArray(value.events)) {
        throw new Error("배송 상세 응답이 올바르지 않습니다.");
    }
    return {
        ...shipment,
        address: readNullableText(value.address),
        addressDetail: readNullableText(value.addressDetail),
        lastCheckedAt: readDateTime(value.lastCheckedAt),
        lastTrackingStatus: readNullableText(value.lastTrackingStatus),
        events: value.events.map(parseEvent),
    };
}
function parseEvent(value) {
    if (!isRecord(value) || !isId(value.id) || !isEventStatus(value.status)) {
        throw new Error("배송 이력 응답이 올바르지 않습니다.");
    }
    return {
        id: value.id,
        status: value.status,
        description: readNullableText(value.description),
        occurredAt: readDateTime(value.occurredAt),
    };
}
function isStatus(value) {
    return typeof value === "string" && statuses.some((status) => status === value);
}
function isMethod(value) {
    return typeof value === "string" && methods.some((method) => method === value);
}
function isEventStatus(value) {
    return typeof value === "string" && eventStatuses.some((status) => status === value);
}
function readText(value) {
    if (typeof value !== "string") {
        throw new Error("배송 응답이 올바르지 않습니다.");
    }
    return value;
}
function readNullableText(value) {
    if (value === null || value === undefined) {
        return null;
    }
    return readText(value);
}
function readDateTime(value) {
    if (value === null || value === undefined) {
        return null;
    }
    if (typeof value === "string") {
        return value;
    }
    if (Array.isArray(value) && value.length >= 3 && value.every((part) => typeof part === "number")) {
        const [year, month, day, hour = 0, minute = 0] = value;
        const pad = (part) => String(part).padStart(2, "0");
        return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00`;
    }
    throw new Error("배송 응답이 올바르지 않습니다.");
}
