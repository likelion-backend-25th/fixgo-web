import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Notice } from "@/components/ui/Panel";
import { cn } from "@/lib/cn";
import { fetchEmailDetail, fetchEmailHistory, retryNotificationEmail, type EmailDetail, type EmailHistoryItem, type NotificationStatus } from "@/lib/notificationApi";

const PAGE_SIZE = 20;

function displaySentAt(value: string | null): string {
  if (value === null || value === "") {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.replaceAll("-", ".");
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}.${pad(date.getMonth() + 1)}.${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function statusLabel(status: NotificationStatus): string {
  if (status === "SENT") {
    return "성공";
  }
  if (status === "FAILED") {
    return "실패";
  }
  if (status === "SENDING") {
    return "발송중";
  }
  return "대기";
}

function statusClass(status: NotificationStatus): string {
  if (status === "SENT") {
    return "text-green-600";
  }
  if (status === "FAILED") {
    return "text-red-600";
  }
  return "text-neutral-600";
}

export function NotificationListPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"" | "SENT" | "FAILED">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [applied, setApplied] = useState({ keyword: "", startDate: "", endDate: "", status: "" as "" | "SENT" | "FAILED" });
  const [rows, setRows] = useState<EmailHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const dateInvalid = from !== "" && to !== "" && from > to;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = { keyword: query.trim(), startDate: from, endDate: to };
      setApplied((current) => {
        if (current.keyword === next.keyword && current.startDate === next.startDate && current.endDate === next.endDate) {
          return current;
        }
        return { ...current, ...next };
      });
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [from, query, to]);

  useEffect(() => {
    if (applied.startDate !== "" && applied.endDate !== "" && applied.startDate > applied.endDate) {
      setRows([]);
      setTotal(0);
      setPageCount(1);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetchEmailHistory(
      {
        keyword: applied.keyword,
        startDate: applied.startDate,
        endDate: applied.endDate,
        status: applied.status,
        page,
        size: PAGE_SIZE,
      },
      controller.signal,
    )
      .then((result) => {
        setRows(result.items);
        setTotal(result.totalElements);
        setPageCount(Math.max(1, result.totalPages));
        setError("");
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") {
          return;
        }
        setRows([]);
        setTotal(0);
        setPageCount(1);
        setError(cause instanceof Error ? cause.message : "이메일 발송 내역을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [applied, page]);

  const columns: Column<EmailHistoryItem>[] = [
    { key: "name", header: "고객명", width: "13%", className: "px-4 text-left", render: (row) => row.customerName ?? "-" },
    { key: "email", header: "수신 이메일", width: "28%", className: "px-4 text-left", render: (row) => row.recipientEmail },
    { key: "body", header: "제목", width: "29%", className: "px-4 text-left", render: (row) => row.messageTitle },
    { key: "at", header: "발송일", width: "20%", className: "px-4 text-center", render: (row) => displaySentAt(row.sentAt) },
    {
      key: "status",
      header: "발송 상태",
      width: "10%",
      className: "px-4 text-center",
      render: (row) => <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>,
    },
  ];

  return (
    <div className="email-history-page">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-sm leading-9 text-neutral-500">전체 {total}건</p>
        <TextField value={query} onChange={setQuery} placeholder="고객명, 이메일 검색" className="w-56 [&_input]:h-9" />
        <SelectBox
          value={status}
          onChange={(value) => {
            if (value !== "" && value !== "SENT" && value !== "FAILED") {
              return;
            }
            setStatus(value);
            setApplied((current) => ({ ...current, status: value }));
            setPage(1);
          }}
          options={[
            { value: "", label: "발송 상태 전체" },
            { value: "SENT", label: "성공" },
            { value: "FAILED", label: "실패" },
          ]}
          className="h-9"
        />
        <div className="flex items-center gap-2">
          <TextField type="date" value={from} onChange={setFrom} className="w-40 [&_input]:h-9" />
          <span className="text-sm text-neutral-500">~</span>
          <TextField type="date" value={to} onChange={setTo} className="w-40 [&_input]:h-9" />
        </div>
      </div>
      {dateInvalid && <Notice tone="error">시작일은 종료일보다 늦을 수 없습니다.</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => String(row.id)}
        onRowClick={(row) => setSelectedId(row.id)}
        tableClassName="email-history-table"
        emptyText={loading ? "발송 내역을 불러오는 중입니다." : "조건에 맞는 발송 내역이 없습니다."}
      />
      <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
      {selectedId !== null && (
        <EmailDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onRetried={(result) => {
            setRows((current) => current.map((row) => (
              row.id === selectedId
                ? { ...row, status: result.status, sentAt: result.sentAt ?? row.sentAt }
                : row
            )));
          }}
        />
      )}
    </div>
  );
}

function EmailDetailModal({
  id,
  onClose,
  onRetried,
}: {
  id: number;
  onClose: () => void;
  onRetried: (result: { status: NotificationStatus; sentAt: string | null }) => void;
}) {
  const [detail, setDetail] = useState<EmailDetail | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchEmailDetail(id, controller.signal)
      .then((result) => {
        setDetail(result);
        setError("");
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") {
          return;
        }
        setDetail(null);
        setError(cause instanceof Error ? cause.message : "이메일 상세를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [id]);

  async function resend() {
    if (retrying) {
      return;
    }
    setRetrying(true);
    setError("");
    setNotice("");
    try {
      const result = await retryNotificationEmail(id);
      setDetail((current) => (
        current === null
          ? current
          : {
              ...current,
              notificationStatus: result.status,
              sentAt: result.sentAt ?? current.sentAt,
              errorMessage: result.status === "FAILED" ? current.errorMessage : null,
            }
      ));
      onRetried(result);
      if (result.status === "FAILED") {
        setError("이메일 발송에 실패했습니다.");
        return;
      }
      setNotice("이메일을 다시 발송했습니다.");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "이메일 재발송에 실패했습니다.");
    } finally {
      setRetrying(false);
    }
  }

  const receptionNumber = detail?.receptionNumber?.trim() ?? "";
  const failed = detail?.notificationStatus === "FAILED";

  return (
    <Modal title="이메일 발송 상세" wide onClose={onClose}>
      {error !== "" && <Notice tone="error">{error}</Notice>}
      {notice !== "" && <Notice>{notice}</Notice>}
      {detail === null && error === "" && <p className="text-sm text-neutral-500">상세를 불러오는 중입니다.</p>}
      {detail !== null && (
        <>
          <div className="grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:grid-cols-3">
            <Field label="발송번호" value={detail.id} />
            <Field label="발송일시" value={displaySentAt(detail.sentAt)} />
            <Field label="발송 상태" value={<span className={statusClass(detail.notificationStatus)}>{statusLabel(detail.notificationStatus)}</span>} />
          </div>
          <h3 className="mt-5 mb-2 text-sm font-medium">수신자 정보</h3>
          <div className={cn("grid gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm", receptionNumber === "" ? "sm:grid-cols-2" : "sm:grid-cols-3")}>
            <Field label="고객명" value={detail.customerName ?? "-"} />
            {receptionNumber !== "" && (
              <Field label="접수번호" value={<span className="text-[#005A9C]">{receptionNumber}</span>} />
            )}
            <Field label="이메일" value={detail.recipientEmail} />
          </div>
          <h3 className="mt-5 mb-2 text-sm font-medium">이메일 제목</h3>
          <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm">{detail.messageTitle}</p>
          <h3 className="mt-5 mb-2 text-sm font-medium">이메일 내용</h3>
          <p className="whitespace-pre-line rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm">{detail.message}</p>
          {failed && (
            <>
              <h3 className="mt-5 mb-2 text-sm font-medium">발송 결과</h3>
              <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-neutral-100 text-left">
                    <tr>
                      {["결과", "발송 시각"].map((header) => (
                        <th key={header} className="px-3 py-2 font-medium">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-neutral-200">
                      <td className="px-3 py-2 text-red-600">실패</td>
                      <td className="px-3 py-2">{displaySentAt(detail.sentAt)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {detail.errorMessage !== null && detail.errorMessage.trim() !== "" && (
                <p className="mt-2 text-sm text-red-600">{detail.errorMessage}</p>
              )}
            </>
          )}
        </>
      )}
      {failed && (
        <div className="mt-4 flex justify-end">
          <Button disabled={retrying} onClick={() => void resend()}>
            {retrying ? "발송 중…" : "재발송"}
          </Button>
        </div>
      )}
    </Modal>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
