import { apiFetch, isId, isRecord, readErrorMessage } from "@/lib/apiClient";
const MEMBER_API = "/api/v1/member";
const ADMIN_MEMBER_API = "/api/v1/admin/member";
export const memberRoles = [
    { value: "ROLE_ADMIN", label: "관리자" },
    { value: "ROLE_RECEPTIONIST", label: "접수담당자" },
    { value: "ROLE_TECHNICIAN", label: "수리기사" },
];
export const memberStatuses = [
    { value: "ACTIVE", label: "사용" },
    { value: "INACTIVE", label: "비활성" },
    { value: "DELETED", label: "삭제" },
];
export function parseMemberRole(value) {
    return memberRoles.find((option) => option.value === value)?.value;
}
export function parseMemberStatus(value) {
    return memberStatuses.find((option) => option.value === value)?.value;
}
export function memberRoleLabel(role) {
    return memberRoles.find((option) => option.value === role)?.label ?? role;
}
export function memberStatusLabel(status) {
    return memberStatuses.find((option) => option.value === status)?.label ?? status;
}
export async function fetchMembers(signal) {
    const members = [];
    let totalPages = 1;
    for (let page = 0; page < totalPages; page += 1) {
        const response = await apiFetch(`${MEMBER_API}?page=${page}&size=100`, { signal });
        const body = await readMemberJson(response, "직원 목록을 불러오지 못했습니다.");
        if (!isRecord(body) || !Array.isArray(body.content)
            || typeof body.totalPages !== "number" || !Number.isSafeInteger(body.totalPages) || body.totalPages < 0) {
            throw new Error("직원 목록 응답이 올바르지 않습니다.");
        }
        members.push(...body.content.map(parseMemberSummary));
        totalPages = body.totalPages;
    }
    return members;
}
export async function fetchMember(id, signal) {
    const response = await apiFetch(`${MEMBER_API}/${id}`, { signal });
    return parseMemberDetail(await readMemberJson(response, "직원 정보를 불러오지 못했습니다."));
}
export async function issueMember(input) {
    const response = await sendMember("", "POST", input);
    return parseMemberDetail(await readMemberJson(response, "계정을 발급하지 못했습니다."));
}
export async function updateMemberProfile(input) {
    const response = await sendMember("/profile", "PATCH", input);
    return parseMemberDetail(await readMemberJson(response, "직원 정보를 저장하지 못했습니다."));
}
export async function updateMemberStatus(email, status) {
    const response = await sendMember("/status", "PATCH", { email, status });
    return parseMemberSummary(await readMemberJson(response, "직원 상태를 변경하지 못했습니다."));
}
export async function updateMemberRole(email, role) {
    const response = await sendMember("/role", "PATCH", { email, role });
    return parseMemberSummary(await readMemberJson(response, "직원 역할을 변경하지 못했습니다."));
}
export async function deleteMember(id) {
    const response = await apiFetch(`${ADMIN_MEMBER_API}?memberId=${id}`, { method: "DELETE" });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "직원 계정을 삭제하지 못했습니다."));
    }
}
function sendMember(path, method, body) {
    return apiFetch(`${ADMIN_MEMBER_API}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
}
async function readMemberJson(response, fallback) {
    if (!response.ok)
        throw new Error(await readErrorMessage(response, fallback));
    try {
        return await response.json();
    }
    catch {
        throw new Error("직원 정보 응답이 올바르지 않습니다.");
    }
}
function parseMemberSummary(value) {
    if (!isRecord(value) || !isId(value.id) || typeof value.email !== "string" || typeof value.name !== "string") {
        throw new Error("직원 정보 응답이 올바르지 않습니다.");
    }
    const role = parseMemberRole(value.role);
    const status = parseMemberStatus(value.status);
    if (role === undefined || status === undefined) {
        throw new Error("직원 역할 또는 상태 응답이 올바르지 않습니다.");
    }
    return { id: value.id, email: value.email, name: value.name, role, status };
}
function parseMemberDetail(value) {
    const summary = parseMemberSummary(value);
    if (!isRecord(value) || typeof value.phone !== "string" || typeof value.address !== "string") {
        throw new Error("직원 상세 응답이 올바르지 않습니다.");
    }
    return { ...summary, phone: value.phone, address: value.address,
        profileImgUrl: typeof value.profileImgUrl === "string" ? value.profileImgUrl : "" };
}
