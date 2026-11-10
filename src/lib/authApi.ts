import type { SessionUser, StaffRole } from "@/types/staff";
import { apiFetch, isId, isRecord, readApiJson } from "@/lib/apiClient";
import { useSessionStore } from "@/stores/useSessionStore";

export interface ApiSession {
  user: SessionUser;
  accessToken: string;
  memberId: number;
}

export async function loginWithPassword(email: string, password: string): Promise<ApiSession> {
  let response: Response;
  try {
    response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error("로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (!response.ok) {
    throw new Error(await readLoginError(response));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("로그인 응답이 올바르지 않습니다.");
  }
  if (!isRecord(body) || typeof body.accessToken !== "string" || body.accessToken === "") {
    throw new Error("로그인 응답이 올바르지 않습니다.");
  }

  const profile = await fetchProfile(body.accessToken);
  return {
    accessToken: body.accessToken,
    memberId: profile.memberId,
    user: {
      loginId: profile.email,
      password,
      name: profile.name,
      role: profile.role,
      email: profile.email,
      phone: profile.phone,
      address: profile.address,
      workStatus: profile.workStatus,
    },
  };
}

async function fetchProfile(accessToken: string): Promise<{
  memberId: number;
  email: string;
  name: string;
  phone: string;
  address: string;
  role: StaffRole;
  workStatus: string;
}> {
  let response: Response;
  try {
    response = await fetch("/api/v1/member/me", {
      headers: { Accept: "application/json", Authorization: `Bearer ${accessToken}` },
    });
  } catch {
    throw new Error("로그인 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!response.ok) {
    throw new Error("로그인 후 직원 정보를 불러오지 못했습니다.");
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
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

function toStaffRole(value: unknown): StaffRole {
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

export async function changeMyPassword(email: string, password: string): Promise<void> {
  const response = await apiFetch("/api/v1/member/me/password", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  await readApiJson(response, "비밀번호를 변경하지 못했습니다.");
}

export async function logoutFromServer(): Promise<void> {
  const token = useSessionStore.getState().accessToken;
  if (typeof token === "string" && token !== "") {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // 서버 로그아웃이 실패해도 화면 세션은 끊는다.
    }
  }
  useSessionStore.getState().logout();
}

async function readLoginError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.message === "string" && body.message.trim() !== "") {
      return body.message;
    }
  } catch {
    // 본문이 JSON이 아니면 아래 문구를 쓴다.
  }
  if (response.status === 401) {
    return "아이디 또는 비밀번호가 올바르지 않습니다.";
  }
  return `로그인에 실패했습니다. (${response.status})`;
}
