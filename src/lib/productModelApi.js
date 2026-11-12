import { apiFetch, isAbortError, isId, isRecord, readErrorMessage } from "@/lib/apiClient";
const categories = ["LAPTOP", "PHONE"];
export function productModelStatusLabel(isActive) {
    return isActive ? "사용" : "단종";
}
export function categoryToLabel(category) {
    return category === "LAPTOP" ? "노트북" : "스마트폰";
}
export async function fetchProductModels(query, signal) {
    const params = new URLSearchParams({
        page: String(query.page - 1),
        size: String(query.size),
    });
    if (query.keyword.trim() !== "") {
        params.set("keyword", query.keyword.trim());
    }
    const response = await apiFetch(`/api/v1/product-models/list?${params.toString()}`, { signal });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "지원 품목 목록을 불러오지 못했습니다."));
    }
    const body = await readJson(response, "지원 품목 목록 응답이 올바르지 않습니다.");
    if (!isPage(body)) {
        throw new Error("지원 품목 목록 응답이 올바르지 않습니다.");
    }
    return {
        items: body.content.map(parseProductModel),
        number: body.number,
        size: body.size,
        totalElements: body.totalElements,
        totalPages: body.totalPages,
    };
}
export async function createProductModel(input) {
    const response = await apiFetch("/api/v1/product-models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "모델을 등록하지 못했습니다."));
    }
    return parseProductModel(await readJson(response, "모델 등록 응답이 올바르지 않습니다."));
}
export async function updateProductModel(id, input) {
    const response = await apiFetch(`/api/v1/product-models/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "모델을 수정하지 못했습니다."));
    }
    return parseProductModel(await readJson(response, "모델 수정 응답이 올바르지 않습니다."));
}
function parseProductModel(value) {
    if (!isRecord(value)
        || !isId(value.id)
        || typeof value.name !== "string"
        || typeof value.modelName !== "string"
        || !isCategory(value.category)
        || !isWholeNumber(value.warrantyMonths)
        || typeof value.createdAt !== "string"
        || !isNullableString(value.updatedAt)) {
        throw new Error("지원 품목 응답이 올바르지 않습니다.");
    }
    const isActive = readIsActive(value);
    if (isActive === null) {
        throw new Error("지원 품목 응답이 올바르지 않습니다.");
    }
    return {
        id: value.id,
        name: value.name,
        modelName: value.modelName,
        category: value.category,
        warrantyMonths: value.warrantyMonths,
        isActive,
        createdAt: value.createdAt,
        updatedAt: value.updatedAt,
    };
}
function readIsActive(value) {
    if (typeof value.isActive === "boolean")
        return value.isActive;
    if (typeof value.active === "boolean")
        return value.active;
    return null;
}
function isCategory(value) {
    return typeof value === "string" && categories.some((item) => item === value);
}
function isPage(value) {
    return isRecord(value)
        && Array.isArray(value.content)
        && Number.isInteger(value.number)
        && Number.isInteger(value.size)
        && typeof value.totalElements === "number"
        && Number.isFinite(value.totalElements)
        && Number.isInteger(value.totalPages);
}
function isNullableString(value) {
    return value === null || typeof value === "string";
}
function isWholeNumber(value) {
    return typeof value === "number" && Number.isInteger(value);
}
async function readJson(response, fallback) {
    try {
        return await response.json();
    }
    catch (error) {
        if (isAbortError(error))
            throw error;
        throw new Error(fallback);
    }
}
