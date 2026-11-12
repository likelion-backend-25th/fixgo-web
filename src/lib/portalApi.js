import { resolveApiUrl } from "@/lib/apiClient";
import { AS_RECEPTION_STATUSES } from "@/types/asReception";
export class InvalidPortalLinkError extends Error {
    constructor() {
        super("링크가 유효하지 않습니다");
        this.name = "InvalidPortalLinkError";
    }
}
const statuses = ["NOT_ISSUED", "UNPAID", "IN_PROGRESS", "WAITING_FOR_DEPOSIT", "PAID", "REFUNDED"];
export async function fetchPortal(token, signal) {
    if (token === "") {
        throw new InvalidPortalLinkError();
    }
    let response;
    try {
        response = await fetch(resolveApiUrl(`/api/v1/portal/${encodeURIComponent(token)}`), {
            signal,
            headers: { Accept: "application/json" },
        });
    }
    catch (error) {
        if (isAbortError(error)) {
            throw error;
        }
        throw new Error("포털 정보를 불러오지 못했습니다.");
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
        throw new Error("포털 정보를 불러오지 못했습니다.");
    }
    if (!response.ok) {
        throw new InvalidPortalLinkError();
    }
    let body;
    try {
        body = await response.json();
    }
    catch {
        throw new Error("포털 정보를 불러오지 못했습니다.");
    }
    const portal = parsePortal(body);
    if (portal === null) {
        throw new Error("포털 정보를 불러오지 못했습니다.");
    }
    return portal;
}
export async function startPortalPayment(token) {
    let response;
    try {
        response = await fetch(resolveApiUrl(`/api/v1/portal/${encodeURIComponent(token)}/payments/start`), {
            method: "POST",
            redirect: "manual",
            headers: { Accept: "application/json" },
        });
    }
    catch {
        throw new Error("결제를 시작하지 못했습니다.");
    }
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "결제를 시작하지 못했습니다."));
    }
    let body;
    try {
        body = await response.json();
    }
    catch {
        throw new Error("결제 시작 응답이 올바르지 않습니다.");
    }
    if (!isStartPaymentResponse(body)) {
        throw new Error("결제 시작 응답이 올바르지 않습니다.");
    }
    return body;
}
export async function decidePortalQuote(token, decision) {
    const fallback = decision === "approve"
        ? "견적을 승인하지 못했습니다. 다시 시도해 주세요."
        : "견적을 거부하지 못했습니다. 다시 시도해 주세요.";
    let response;
    try {
        response = await fetch(resolveApiUrl(`/api/v1/portal/${encodeURIComponent(token)}/quote/${decision}`), {
            method: "POST",
            redirect: "manual",
            headers: { Accept: "application/json" },
        });
    }
    catch {
        throw new Error(fallback);
    }
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, fallback));
    }
    // 성공 응답은 204 No Content라 본문이 없다.
}
export async function cancelPortalPayment(token) {
    let response;
    try {
        response = await fetch(resolveApiUrl(`/api/v1/portal/${encodeURIComponent(token)}/payments/cancel`), {
            method: "POST",
            redirect: "manual",
            headers: { Accept: "application/json" },
        });
    }
    catch {
        throw new Error("가상계좌를 취소하지 못했습니다. 다시 시도해 주세요.");
    }
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "가상계좌를 취소하지 못했습니다. 다시 시도해 주세요."));
    }
    // 성공 응답은 204 No Content라 본문이 없다.
}
const confirmInflight = new Map();
export function confirmPaymentOnce(request) {
    const key = `${request.orderId}\n${request.paymentKey}\n${request.amount}`;
    const current = confirmInflight.get(key);
    if (current !== undefined) {
        return current;
    }
    const pending = postConfirm(request).finally(() => {
        confirmInflight.delete(key);
    });
    confirmInflight.set(key, pending);
    return pending;
}
export function parseAmountParam(raw) {
    if (raw === null || !/^\d+$/.test(raw)) {
        return null;
    }
    const amount = Number(raw);
    if (!Number.isSafeInteger(amount)) {
        return null;
    }
    return amount;
}
async function postConfirm(request) {
    let response;
    try {
        response = await fetch(resolveApiUrl("/api/v1/payments/confirm"), {
            method: "POST",
            redirect: "manual",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                paymentKey: request.paymentKey,
                orderId: request.orderId,
                amount: request.amount,
            }),
        });
    }
    catch {
        throw new Error("결제 승인에 실패했습니다. 다시 시도해 주세요.");
    }
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "결제 승인에 실패했습니다. 다시 시도해 주세요."));
    }
    // 성공 응답은 204 No Content라 본문이 없다.
}
function parsePortal(value) {
    if (!isRecord(value)) {
        return null;
    }
    const reception = parseReception(value.reception);
    if (reception === null) {
        return null;
    }
    // 아직 도달하지 않은 견적·결제는 null이다. 형식이 달라도 접수 내역은 남긴다.
    return {
        reception,
        quote: parseQuote(value.quote),
        payment: parsePayment(value.payment),
    };
}
const quoteStatuses = ["PENDING", "APPROVED", "REJECTED"];
function parseQuote(value) {
    if (!isRecord(value) || !isQuoteStatus(value.status)) {
        return null;
    }
    const laborCost = readAmount(value.laborCost);
    const inspectionCost = readAmount(value.inspectionCost);
    const totalAmount = readAmount(value.totalAmount);
    if (laborCost === null || inspectionCost === null || totalAmount === null) {
        return null;
    }
    return {
        status: value.status,
        diagnosis: readNullableString(value.diagnosis),
        items: parseQuoteItems(value.items),
        laborCost,
        inspectionCost,
        totalAmount,
        issuedAt: readNullableString(value.issuedAt),
    };
}
function parseQuoteItems(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const items = [];
    for (const item of value) {
        if (!isRecord(item) || typeof item.name !== "string" || item.name.trim() === "") {
            continue;
        }
        const quantity = readAmount(item.quantity);
        const unitPrice = readAmount(item.unitPrice);
        const amount = readAmount(item.amount);
        if (quantity === null || unitPrice === null || amount === null) {
            continue;
        }
        items.push({ name: item.name, quantity, unitPrice, amount });
    }
    return items;
}
function readAmount(value) {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function isQuoteStatus(value) {
    return typeof value === "string" && quoteStatuses.includes(value);
}
function parseReception(value) {
    if (!isRecord(value) || !isReceptionStatus(value.status)) {
        return null;
    }
    return {
        receptionNumber: readNullableString(value.receptionNumber),
        receivedAt: readNullableString(value.receivedAt),
        customerName: readNullableString(value.customerName),
        customerPhone: readNullableString(value.customerPhone),
        modelName: readNullableString(value.modelName),
        serialNumber: readNullableString(value.serialNumber),
        symptom: readNullableString(value.symptom),
        symptomDetail: readNullableString(value.symptomDetail),
        status: value.status,
        histories: parseHistories(value.histories),
    };
}
function parseHistories(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    const histories = [];
    for (const item of value) {
        if (!isRecord(item) || !isReceptionStatus(item.status)) {
            continue;
        }
        histories.push({
            status: item.status,
            changedAt: readNullableString(item.changedAt),
        });
    }
    return histories;
}
function parsePayment(value) {
    if (!isRecord(value) || !isPaymentStatus(value.status)) {
        return null;
    }
    return {
        status: value.status,
        orderName: readNullableString(value.orderName),
        amount: typeof value.amount === "number" && Number.isFinite(value.amount) ? value.amount : null,
        paymentMethod: readPaymentMethod(value.paymentMethod),
        paidAt: readNullableString(value.paidAt),
        virtualAccount: parseVirtualAccount(value.virtualAccount),
    };
}
function parseVirtualAccount(value) {
    if (!isRecord(value)) {
        return null;
    }
    return {
        bankName: readNullableString(value.bankName),
        accountNumber: readNullableString(value.accountNumber),
        dueAt: readNullableString(value.dueAt),
    };
}
function readNullableString(value) {
    return typeof value === "string" ? value : null;
}
function readPaymentMethod(value) {
    if (value === "CARD" || value === "EASY_PAY" || value === "VIRTUAL_ACCOUNT" || value === "CASH") {
        return value;
    }
    return null;
}
function isReceptionStatus(value) {
    return typeof value === "string" && AS_RECEPTION_STATUSES.includes(value);
}
function isPaymentStatus(value) {
    return typeof value === "string" && statuses.includes(value);
}
function isStartPaymentResponse(value) {
    return isRecord(value)
        && typeof value.orderId === "string"
        && value.orderId !== ""
        && typeof value.orderName === "string"
        && typeof value.amount === "number"
        && Number.isFinite(value.amount);
}
async function readErrorMessage(response, fallback) {
    try {
        const body = await response.json();
        if (isRecord(body) && typeof body.message === "string" && body.message.trim() !== "") {
            return body.message;
        }
    }
    catch {
        // 본문이 JSON이 아니면 기본 문구를 쓴다.
    }
    return fallback;
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function isAbortError(error) {
    return error instanceof DOMException && error.name === "AbortError";
}
