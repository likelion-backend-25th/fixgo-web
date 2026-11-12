import { apiFetch, isRecord, readErrorMessage } from "@/lib/apiClient";
export async function fetchEmailPresets(signal) {
    const body = await request("/api/v1/email-presets", { signal }, "이메일 프리셋 목록을 불러오지 못했습니다.");
    if (!Array.isArray(body)) {
        throw new Error("이메일 프리셋 목록 응답이 올바르지 않습니다.");
    }
    return body.map(parseEmailPreset);
}
export async function createEmailPreset(preset) {
    const body = await request("/api/v1/email-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preset),
    }, "이메일 프리셋 등록에 실패했습니다.");
    return parseEmailPreset(body);
}
export async function updateEmailPreset(id, preset) {
    const body = await request(`/api/v1/email-presets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preset),
    }, "이메일 프리셋 수정에 실패했습니다.");
    return parseEmailPreset(body);
}
export async function deleteEmailPreset(id) {
    await request(`/api/v1/email-presets/${id}`, { method: "DELETE" }, "이메일 프리셋 삭제에 실패했습니다.");
}
async function request(url, init, fallback) {
    const response = await apiFetch(url, init);
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, fallback));
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
        return undefined;
    }
    const text = await response.text();
    if (text.trim() === "") {
        return undefined;
    }
    try {
        return JSON.parse(text);
    }
    catch {
        throw new Error("이메일 프리셋 응답이 올바르지 않습니다.");
    }
}
function parseEmailPreset(value) {
    if (!isRecord(value)
        || typeof value.id !== "number"
        || typeof value.name !== "string"
        || typeof value.messageTitle !== "string"
        || typeof value.message !== "string") {
        throw new Error("이메일 프리셋 응답이 올바르지 않습니다.");
    }
    return {
        id: value.id,
        name: value.name,
        messageTitle: value.messageTitle,
        message: value.message,
    };
}
