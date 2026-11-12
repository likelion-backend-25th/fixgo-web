import { apiFetch, isId, isRecord, readApiJson, resolveApiUrl } from "@/lib/apiClient";
import { useSessionStore } from "@/stores/useSessionStore";
export async function loginWithPassword(email, password) {
    const response = await postLogin(email, password);
    if (!response.ok) {
        throw new Error(await readLoginError(response));
    }
    const issued = await readIssuedTokens(response);
    const profile = await fetchProfile(issued.accessToken);
    return {
        accessToken: issued.accessToken,
        refreshToken: issued.refreshToken,
        memberId: profile.memberId,
        user: {
            loginId: profile.email,
            name: profile.name,
            role: profile.role,
            email: profile.email,
            phone: profile.phone,
            address: profile.address,
            workStatus: profile.workStatus,
        },
    };
}
export async function confirmCurrentPassword(email, password) {
    const response = await postLogin(email, password);
    if (response.ok) {
        // 비밀번호 확인만 한다. 이 응답의 토큰과 비밀번호는 세션에 넣지 않는다.
        return;
    }
    if (response.status === 401) {
        throw new Error("기존 비밀번호가 일치하지 않습니다.");
    }
    throw new Error(await readLoginError(response));
}
async function postLogin(email, password) {
    try {
        return await fetch(resolveApiUrl("/api/v1/auth/login"), {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
    }
    catch {
        throw new Error("로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
}
async function readIssuedTokens(response) {
    let body;
    try {
        body = await response.json();
    }
    catch {
        throw new Error("로그인 응답이 올바르지 않습니다.");
    }
    if (!isRecord(body)
        || typeof body.accessToken !== "string"
        || body.accessToken === ""
        || typeof body.refreshToken !== "string"
        || body.refreshToken === "") {
        throw new Error("로그인 응답이 올바르지 않습니다.");
    }
    return { accessToken: body.accessToken, refreshToken: body.refreshToken };
}
async function fetchProfile(accessToken) {
    let response;
    try {
        response = await fetch(resolveApiUrl("/api/v1/member/me"), {
            headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
        });
    }
    catch {
        throw new Error("로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    if (!response.ok) {
        throw new Error("로그인 후 직원 정보를 불러오지 못했습니다.");
    }
    let body;
    try {
        body = await response.json();
    }
    catch {
        throw new Error("직원 정보 응답이 올바르지 않습니다.");
    }
    if (!isRecord(body) || !isId(body.id) || typeof body.email !== "string" || typeof body.name !== "string") {
        throw new Error("직원 정보 응답이 올바르지 않습니다.");
    }
    return {
        memberId: body.id,
        email: body.email,
        name: body.name,
        phone: typeof body.phone === "string" ? body.phone : "",
        address: typeof body.address === "string" ? body.address : "",
        role: toStaffRole(body.role),
        workStatus: body.status === "INACTIVE" ? "비활성" : "근무 중",
    };
}
function toStaffRole(value) {
    if (value === "ROLE_ADMIN") {
        return "ADMIN";
    }
    if (value === "ROLE_RECEPTIONIST") {
        return "RECEPTIONIST";
    }
    if (value === "ROLE_TECHNICIAN") {
        return "TECHNICIAN";
    }
    throw new Error("지원하지 않는 직원 권한입니다.");
}
export async function changeMyPassword(email, password) {
    const response = await apiFetch("/api/v1/member/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    await readApiJson(response, "비밀번호를 변경하지 못했습니다.");
}
export async function logoutFromServer() {
    const { accessToken, refreshToken } = useSessionStore.getState();
    try {
        await revokeIssuedTokens(accessToken, refreshToken);
    }
    catch {
        // 서버 파기에 실패해도 브라우저에 남은 토큰은 지운다.
    }
    useSessionStore.getState().logout();
}
async function revokeIssuedTokens(accessToken, refreshToken) {
    if (typeof accessToken === "string" && accessToken !== "") {
        const response = await requestLogout(accessToken);
        if (response.ok || response.status !== 401) {
            return;
        }
    }
    if (typeof refreshToken !== "string" || refreshToken === "") {
        return;
    }
    // 액세스 토큰이 만료됐으면 한 번 갱신한 뒤 로그아웃해, 계정에 남은 리프레시 토큰을 모두 파기한다.
    const renewed = await refreshAccessToken(refreshToken);
    await requestLogout(renewed);
}
async function requestLogout(accessToken) {
    return fetch(resolveApiUrl("/api/v1/auth/logout"), {
        method: "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    });
}
async function refreshAccessToken(refreshToken) {
    let response;
    try {
        response = await fetch(resolveApiUrl("/api/v1/auth/refresh"), {
            method: "POST",
            headers: { Accept: "application/json", "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
        });
    }
    catch {
        throw new Error("로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }
    if (!response.ok) {
        throw new Error("토큰을 갱신하지 못했습니다.");
    }
    let body;
    try {
        body = await response.json();
    }
    catch {
        throw new Error("토큰을 갱신하지 못했습니다.");
    }
    if (!isRecord(body) || typeof body.accessToken !== "string" || body.accessToken === "") {
        throw new Error("토큰을 갱신하지 못했습니다.");
    }
    return body.accessToken;
}
async function readLoginError(response) {
    try {
        const body = await response.json();
        if (isRecord(body) && typeof body.message === "string" && body.message.trim() !== "") {
            return body.message;
        }
    }
    catch {
        // 본문이 JSON이 아니면 아래 문구를 쓴다.
    }
    if (response.status === 401) {
        return "아이디 또는 비밀번호가 올바르지 않습니다.";
    }
    return `로그인에 실패했습니다. (${response.status})`;
}
