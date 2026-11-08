import { apiFetch, isRecord, readErrorMessage } from "@/lib/apiClient";

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

export interface EmailHistoryItem {
  id: number;
  customerName: string | null;
  recipientEmail: string;
  notificationType: NotificationType;
  messageTitle: string;
  status: NotificationStatus;
  sentAt: string | null;
  createdAt: string;
}

export interface EmailHistoryQuery {
  keyword: string;
  startDate: string;
  endDate: string;
  page: number;
  size: number;
}

export interface EmailHistoryPage {
  items: EmailHistoryItem[];
  totalElements: number;
  totalPages: number;
}

export interface EmailStatistics {
  total: number;
  success: number;
  failed: number;
}

export interface EmailDetail {
  id: number;
  customerName: string | null;
  receptionNumber: string | null;
  recipientEmail: string;
  messageTitle: string;
  message: string;
  notificationStatus: NotificationStatus;
  sentAt: string | null;
  errorMessage: string | null;
}

const notificationTypes: readonly NotificationType[] = ["RECEIVED", "ESTIMATE", "REPAIR", "PAYMENT", "SHIPPING"];
const notificationStatuses: readonly NotificationStatus[] = ["PENDING", "SENDING", "SENT", "FAILED"];

export async function sendNotificationEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
  const response = await apiFetch("/api/v1/notifications/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipientEmail: request.recipientEmail,
      messageTitle: request.messageTitle,
      message: request.message,
      notificationType: request.notificationType,
    }),
  });

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

export async function retryNotificationEmail(id: number): Promise<SendEmailResponse> {
  const response = await apiFetch(`/api/v1/notifications/emails/${id}/retry`, { method: "POST" });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "이메일 재발송에 실패했습니다."));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("이메일 재발송 응답이 올바르지 않습니다.");
  }
  if (!isSendEmailResponse(body)) {
    throw new Error("이메일 재발송 응답이 올바르지 않습니다.");
  }
  return {
    id: body.id,
    recipientEmail: body.recipientEmail,
    notificationType: body.notificationType,
    messageTitle: body.messageTitle,
    status: body.status,
    sentAt: typeof body.sentAt === "string" ? body.sentAt : null,
  };
}

export async function fetchEmailHistory(query: EmailHistoryQuery, signal: AbortSignal): Promise<EmailHistoryPage> {
  const params = new URLSearchParams();
  if (query.keyword !== "") {
    params.set("keyword", query.keyword);
  }
  if (query.startDate !== "") {
    params.set("startDate", query.startDate);
  }
  if (query.endDate !== "") {
    params.set("endDate", query.endDate);
  }
  // Spring Pageable은 0부터 센다.
  params.set("page", String(query.page - 1));
  params.set("size", String(query.size));

  const response = await apiFetch(`/api/v1/notifications/emails?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "이메일 발송 내역을 불러오지 못했습니다."));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("이메일 발송 내역 응답이 올바르지 않습니다.");
  }
  if (!isRecord(body) || !Array.isArray(body.content) || typeof body.totalElements !== "number" || typeof body.totalPages !== "number") {
    throw new Error("이메일 발송 내역 응답이 올바르지 않습니다.");
  }

  return {
    items: body.content.map(parseEmailHistoryItem),
    totalElements: body.totalElements,
    totalPages: body.totalPages,
  };
}

export async function fetchEmailStatistics(signal: AbortSignal): Promise<EmailStatistics> {
  const response = await apiFetch("/api/v1/notifications/statistics", { signal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "이메일 발송 통계를 불러오지 못했습니다."));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("이메일 발송 통계 응답이 올바르지 않습니다.");
  }
  if (!isRecord(body) || typeof body.total !== "number" || typeof body.success !== "number" || typeof body.failed !== "number") {
    throw new Error("이메일 발송 통계 응답이 올바르지 않습니다.");
  }
  return { total: body.total, success: body.success, failed: body.failed };
}

export async function fetchEmailDetail(id: number, signal: AbortSignal): Promise<EmailDetail> {
  const response = await apiFetch(`/api/v1/notifications/emails/${id}`, { signal });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "이메일 상세를 불러오지 못했습니다."));
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error("이메일 상세 응답이 올바르지 않습니다.");
  }
  if (!isRecord(body)
    || typeof body.id !== "number"
    || !isNullableString(body.customerName)
    || !isNullableString(body.receptionNumber)
    || typeof body.recipientEmail !== "string"
    || typeof body.messageTitle !== "string"
    || typeof body.message !== "string"
    || !isNotificationStatus(body.notificationStatus)
    || !isNullableString(body.sentAt)
    || !isNullableString(body.errorMessage)) {
    throw new Error("이메일 상세 응답이 올바르지 않습니다.");
  }
  return {
    id: body.id,
    customerName: body.customerName ?? null,
    receptionNumber: body.receptionNumber ?? null,
    recipientEmail: body.recipientEmail,
    messageTitle: body.messageTitle,
    message: body.message,
    notificationStatus: body.notificationStatus,
    sentAt: body.sentAt ?? null,
    errorMessage: body.errorMessage ?? null,
  };
}

function parseEmailHistoryItem(value: unknown): EmailHistoryItem {
  if (!isRecord(value)
    || typeof value.id !== "number"
    || !isNullableString(value.customerName)
    || typeof value.recipientEmail !== "string"
    || !isNotificationType(value.notificationType)
    || typeof value.messageTitle !== "string"
    || !isNotificationStatus(value.status)
    || !isNullableString(value.sentAt)
    || typeof value.createdAt !== "string") {
    throw new Error("이메일 발송 내역 응답이 올바르지 않습니다.");
  }
  return {
    id: value.id,
    customerName: value.customerName ?? null,
    recipientEmail: value.recipientEmail,
    notificationType: value.notificationType,
    messageTitle: value.messageTitle,
    status: value.status,
    sentAt: value.sentAt ?? null,
    createdAt: value.createdAt,
  };
}

function isNullableString(value: unknown): value is string | null | undefined {
  return value === undefined || value === null || typeof value === "string";
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

