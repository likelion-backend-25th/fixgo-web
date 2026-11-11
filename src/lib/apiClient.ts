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

  // 개발 서버는 Vite 프록시(/api → 8080)를 쓰고, 배포 빌드만 환경변수 주소를 붙인다.
  const configured = import.meta.env.VITE_API_BASE_URL ?? "";
  const baseUrl = import.meta.env.DEV ? "" : configured;
  const requestUrl = path.startsWith("http") ? path : `${baseUrl}${path}`;

  try {
    return await fetch(requestUrl, { ...init, headers });
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

export interface SpringPage<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export async function readApiJson(response: Response, fallback: string): Promise<unknown> {
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
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(fallback);
  }
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

export function mapSpringPage<T>(
  value: unknown,
  mapItem: (item: unknown) => T,
  invalidMessage: string,
): SpringPage<T> {
  if (
    !isRecord(value)
    || !Array.isArray(value.content)
    || !isInteger(value.number)
    || !isInteger(value.size)
    || typeof value.totalElements !== "number"
    || !Number.isFinite(value.totalElements)
    || !isInteger(value.totalPages)
  ) {
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
