import { useSessionStore } from "@/stores/useSessionStore";

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  const token = useSessionStore.getState().accessToken;
  if (typeof token === "string" && token !== "") {
    headers.set("Authorization", `Bearer ${token}`);
  }

  try {
    return await fetch(path, { ...init, headers });
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}

export async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  if (response.status === 401) {
    return "로그인이 필요합니다. 직원 이메일로 로그인해 주세요.";
  }
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.message === "string" && body.message.trim() !== "") {
      return body.message;
    }
    if (isRecord(body) && typeof body.detail === "string" && body.detail.trim() !== "") {
      return body.detail;
    }
  } catch {
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
