import { useSessionStore } from "@/stores/useSessionStore";
export async function apiFetch(path, init = {}) {
    return request(path, init, true);
}
async function request(path, init, canRenew) {
    const headers = new Headers(init.headers);
    if (!headers.has("Accept")) {
        headers.set("Accept", "application/json");
    }
    const token = useSessionStore.getState().accessToken;
    const sentToken = typeof token === "string" && token !== "";
    if (sentToken) {
        headers.set("Authorization", `Bearer ${token}`);
    }
    let response;
    try {
        response = await fetch(resolveApiUrl(path), { ...init, headers });
    }
    catch (error) {
        if (isAbortError(error)) {
            throw error;
        }
        throw new Error("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    if (response.status !== 401 || !sentToken || init.signal?.aborted) {
        return response;
    }
    // 액세스 토큰이 만료됐으면 리프레시로 한 번 다시 시도한다. 그것도 실패하면 로그인으로 보낸다.
    if (canRenew) {
        const renewed = await renewAccessToken();
        if (renewed !== null) {
            return request(path, init, false);
        }
    }
    redirectToLogin();
    return response;
}
let pendingRenewal = null;
function renewAccessToken() {
    if (pendingRenewal === null) {
        pendingRenewal = renewAccessTokenOnce().finally(() => {
            pendingRenewal = null;
        });
    }
    return pendingRenewal;
}
async function renewAccessTokenOnce() {
    const refreshToken = useSessionStore.getState().refreshToken;
    if (refreshToken === null || refreshToken === "") {
        return null;
    }
    try {
        const response = await fetch(resolveApiUrl("/api/v1/auth/refresh"), {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) {
            return null;
        }
        const body = await response.json();
        if (!isRecord(body)
            || typeof body.accessToken !== "string"
            || body.accessToken === ""
            || typeof body.refreshToken !== "string"
            || body.refreshToken === "") {
            return null;
        }
        useSessionStore.getState().setTokens(body.accessToken, body.refreshToken);
        return body.accessToken;
    }
    catch {
        return null;
    }
}
function redirectToLogin() {
    useSessionStore.getState().logout();
    if (window.location.pathname !== "/login") {
        window.location.assign("/login");
    }
}
export function resolveApiUrl(path) {
    if (path.startsWith("http")) {
        return path;
    }
    // 개발 서버는 Vite 프록시(/api → 8080)를 쓰고, 배포 빌드만 환경변수 주소를 붙인다.
    const configured = import.meta.env.VITE_API_BASE_URL ?? "";
    const baseUrl = import.meta.env.DEV ? "" : configured;
    return `${baseUrl}${path}`;
}
export async function readErrorMessage(response, fallback) {
    if (response.status === 401) {
        return "로그인이 필요합니다. 직원 이메일로 로그인해 주세요.";
    }
    try {
        const body = await response.json();
        if (isRecord(body) && typeof body.message === "string" && body.message.trim() !== "") {
            return body.message;
        }
        if (isRecord(body) && typeof body.detail === "string" && body.detail.trim() !== "") {
            return body.detail;
        }
    }
    catch {
        // 본문이 JSON이 아니면 상태 코드로 대체한다.
    }
    if (response.status === 403) {
        return "이 기능을 사용할 권한이 없습니다.";
    }
    if (response.status === 404) {
        return "요청한 정보를 찾을 수 없습니다.";
    }
    if (response.status === 502 || response.status === 503 || response.status === 504) {
        return "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.";
    }
    return `${fallback} (${response.status})`;
}
export function isRecord(value) {
    return typeof value === "object" && value !== null;
}
export function isId(value) {
    return typeof value === "number" && Number.isInteger(value) && value > 0;
}
export function isAbortError(error) {
    return error instanceof DOMException && error.name === "AbortError";
}
export async function readApiJson(response, fallback) {
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, fallback));
    }
    if (response.status === 204) {
        return null;
    }
    const text = await response.text();
    if (text.trim() === "") {
        return null;
    }
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error(fallback);
    }
}
function isInteger(value) {
    return typeof value === "number" && Number.isInteger(value);
}
export function mapSpringPage(value, mapItem, invalidMessage) {
    if (!isRecord(value)
        || !Array.isArray(value.content)
        || !isInteger(value.number)
        || !isInteger(value.size)
        || typeof value.totalElements !== "number"
        || !Number.isFinite(value.totalElements)
        || !isInteger(value.totalPages)) {
        throw new Error(invalidMessage);
    }
    return {
        content: value.content.map(mapItem),
        number: value.number,
        size: value.size,
        totalElements: value.totalElements,
        totalPages: value.totalPages,
    };
}
