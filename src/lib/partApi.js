import { apiFetch, isId, isRecord, mapSpringPage, readApiJson } from "@/lib/apiClient";
const statuses = ["ACTIVE", "LOW_QUANTITY", "DISCONTINUED"];
export function partStatusLabel(status) {
    if (status === "ACTIVE") {
        return "사용";
    }
    if (status === "LOW_QUANTITY") {
        return "재고 부족";
    }
    return "단종";
}
export async function fetchParts(query, signal) {
    const params = new URLSearchParams({
        page: String(query.page - 1),
        size: String(query.size),
    });
    // 목록 검색은 GET 쿼리다. 본문에 넣으면 서버가 검색 조건을 받지 못한다.
    const partName = query.partName.trim();
    if (partName !== "") {
        params.set("partName", partName);
    }
    if (query.status != null) {
        params.set("status", query.status);
    }
    if (query.category != null) {
        params.set("category", query.category);
    }
    if (query.productModelId != null) {
        params.set("productModelId", String(query.productModelId));
    }
    const response = await apiFetch(`/api/v1/part?${params.toString()}`, { signal });
    const body = await readApiJson(response, "부품 목록을 불러오지 못했습니다.");
    const page = mapSpringPage(body, parseBrief, "부품 목록 응답이 올바르지 않습니다.");
    const details = await Promise.all(page.content.map((item) => fetchPart(item.id, signal)));
    return { ...page, content: details };
}
export async function fetchPart(id, signal) {
    const response = await apiFetch(`/api/v1/part/${id}`, { signal });
    const body = await readApiJson(response, "부품 정보를 불러오지 못했습니다.");
    return parseDetail(body);
}
export async function updatePartMinutes(id, standardMinutes) {
    const response = await apiFetch("/api/v1/part/standard_minutes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, standardMinutes }),
    });
    await readApiJson(response, "표준 작업시간을 수정하지 못했습니다.");
}
export async function applyRepairPartStock(repairId) {
    const params = new URLSearchParams({ repairId: String(repairId) });
    const response = await apiFetch(`/api/v1/part/stocks?${params.toString()}`, { method: "PATCH" });
    await readApiJson(response, "수리에 사용한 부품 재고를 반영하지 못했습니다.");
}
export async function updatePartPrice(id, unitPrice) {
    const response = await apiFetch("/api/v1/part/unit_price", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, unitPrice }),
    });
    await readApiJson(response, "부품 단가를 수정하지 못했습니다.");
}
export async function updatePartStatus(id, status) {
    const response = await apiFetch("/api/v1/part/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
    });
    await readApiJson(response, "부품 상태를 수정하지 못했습니다.");
}
export async function updatePartStock(id, movementType, quantity, reason) {
    const response = await apiFetch("/api/v1/part/stock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, movementType, quantity, reason }),
    });
    await readApiJson(response, "부품 재고를 수정하지 못했습니다.");
}
function parseBrief(value) {
    if (!isRecord(value)
        || !isId(value.id)
        || typeof value.name !== "string"
        || !isWhole(value.unitPrice)
        || !isWhole(value.stockQuantity)) {
        throw new Error("부품 목록 응답이 올바르지 않습니다.");
    }
    return {
        id: value.id,
        name: value.name,
        unitPrice: value.unitPrice,
        stockQuantity: value.stockQuantity,
    };
}
function parseDetail(value) {
    const brief = parseBrief(value);
    if (!isRecord(value) || !isWhole(value.standardMinutes) || !isStatus(value.status)) {
        throw new Error("부품 정보 응답이 올바르지 않습니다.");
    }
    return {
        ...brief,
        standardMinutes: value.standardMinutes,
        status: value.status,
    };
}
export function isPartStatus(value) {
    return statuses.some((status) => status === value);
}
function isStatus(value) {
    return typeof value === "string" && statuses.some((status) => status === value);
}
function isWhole(value) {
    return typeof value === "number" && Number.isInteger(value);
}
