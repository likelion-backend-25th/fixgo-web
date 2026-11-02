export type NotificationType = "RECEIVED" | "ESTIMATE" | "REPAIR" | "PAYMENT" | "SHIPPING";

export type NotificationStatus = "PENDING" | "SENDING" | "SENT" | "FAILED";

export interface SendEmailRequest {
  recipientEmail: string;
  messageTitle: string;
  message: string;
  notificationType: NotificationType;
}

export interface SendEmailResponse {
  id: number;
  recipientEmail: string;
  notificationType: NotificationType;
  messageTitle: string;
  status: NotificationStatus;
  sentAt: string | null;
}

const notificationTypes: readonly NotificationType[] = ["RECEIVED", "ESTIMATE", "REPAIR", "PAYMENT", "SHIPPING"];
const notificationStatuses: readonly NotificationStatus[] = ["PENDING", "SENDING", "SENT", "FAILED"];

export async function sendNotificationEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
  let response: Response;
  try {
    response = await fetch("/api/v1/notifications/emails", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientEmail: request.recipientEmail,
        messageTitle: request.messageTitle,
        message: request.message,
        notificationType: request.notificationType,
      }),
    });
  } catch {
    throw new Error("이메일 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "이메일 발송에 실패했습니다."));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("이메일 발송 응답이 올바르지 않습니다.");
  }
  if (!isSendEmailResponse(body)) {
    throw new Error("이메일 발송 응답이 올바르지 않습니다.");
  }
  return body;
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

function isSendEmailResponse(value: unknown): value is SendEmailResponse {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.id === "number"
    && typeof value.recipientEmail === "string"
    && isNotificationType(value.notificationType)
    && typeof value.messageTitle === "string"
    && isNotificationStatus(value.status);
}

function isNotificationType(value: unknown): value is NotificationType {
  return notificationTypes.some((type) => type === value);
}

function isNotificationStatus(value: unknown): value is NotificationStatus {
  return notificationStatuses.some((status) => status === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
