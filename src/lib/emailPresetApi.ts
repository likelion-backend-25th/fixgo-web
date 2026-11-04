export interface EmailPreset {
  id: number;
  name: string;
  messageTitle: string;
  message: string;
}

export interface EmailPresetRequest {
  name: string;
  messageTitle: string;
  message: string;
}

export async function fetchEmailPresets(signal: AbortSignal): Promise<EmailPreset[]> {
  const body = await request("/api/v1/email-presets", { signal }, "이메일 프리셋 목록을 불러오지 못했습니다.");
  if (!Array.isArray(body)) {
    throw new Error("이메일 프리셋 목록 응답이 올바르지 않습니다.");
  }
  return body.map(parseEmailPreset);
}

export async function createEmailPreset(preset: EmailPresetRequest): Promise<EmailPreset> {
  const body = await request(
    "/api/v1/email-presets",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset),
    },
    "이메일 프리셋 등록에 실패했습니다.",
  );
  return parseEmailPreset(body);
}

export async function updateEmailPreset(id: number, preset: EmailPresetRequest): Promise<EmailPreset> {
  const body = await request(
    `/api/v1/email-presets/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preset),
    },
    "이메일 프리셋 수정에 실패했습니다.",
  );
  return parseEmailPreset(body);
}

export async function deleteEmailPreset(id: number): Promise<void> {
  await request(`/api/v1/email-presets/${id}`, { method: "DELETE" }, "이메일 프리셋 삭제에 실패했습니다.");
}

async function request(url: string, init: RequestInit, fallback: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init.headers,
      },
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    throw new Error("이메일 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

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
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("이메일 프리셋 응답이 올바르지 않습니다.");
  }
}

function parseEmailPreset(value: unknown): EmailPreset {
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

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && typeof body.message === "string" && body.message.trim() !== "") {
      return body.message;
    }
  } catch {
    // 본문이 JSON이 아니면 기본 문구를 쓴다.
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
