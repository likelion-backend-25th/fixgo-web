import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { Notice, Panel } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import {
  categoryLabel,
  customerPortalUrl,
  fetchCustomerPortalLink,
  fetchMyReception,
  fetchProduct,
  fetchReception,
  fetchReceptionHistory,
  historyStatusLabel,
  receptionStatusLabel,
  returnMethodLabel,
} from "@/lib/asReceptionApi";
import { formatDateTime, formatYearMonthDay } from "@/lib/format";
import { readNotice } from "@/lib/guards";
import { useHeadingMeta } from "@/layouts/RootLayout";
import { useSessionStore } from "@/stores/useSessionStore";
import { DocumentModal, type DocumentKind } from "@/pages/as/DocumentModal";
import { ReceptionEditPanel } from "@/pages/as/ReceptionEditPanel";
import { TechnicianAssignPanel } from "@/pages/as/TechnicianAssignPanel";
import type { AsReceptionDetail, AsReceptionStatus, AsStatusHistory, CustomerPortalLink, ProductSummary } from "@/types/asReception";
import type { AsRecord } from "@/types/screen";

export function AsDetailPage() {
  const { asRequestId = "" } = useParams();
  const location = useLocation();
  const receptionId = Number(asRequestId);
  const validId = Number.isInteger(receptionId) && receptionId > 0;
  const [detail, setDetail] = useState<AsReceptionDetail | null>(null);
  const [product, setProduct] = useState<ProductSummary | null>(null);
  const [history, setHistory] = useState<AsStatusHistory[]>([]);
  const [loading, setLoading] = useState(validId);
  const [error, setError] = useState(validId ? "" : "접수 정보를 찾을 수 없습니다.");
  const [notice, setNotice] = useState(readNotice(location.state) ?? "");
  const [version, setVersion] = useState(0);
  const role = useSessionStore((state) => state.user?.role);
  const isTechnician = role === "TECHNICIAN";
  useHeadingMeta(detail?.receptionNumber);

  useEffect(() => {
    if (!validId) {
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");

    // 상세와 이력을 같이 읽고, 모델명은 제품 API로 보완한다.
    Promise.all([
      isTechnician
        ? fetchMyReception(receptionId, controller.signal)
        : fetchReception(receptionId, controller.signal).then((reception) => ({
            reception,
            repair: null,
          })),
      fetchReceptionHistory(receptionId, controller.signal),
    ])
      .then(async ([loaded, nextHistory]) => {
        if (controller.signal.aborted) {
          return;
        }
        setDetail(loaded.reception);
        setHistory(nextHistory);
        try {
          const nextProduct = await fetchProduct(loaded.reception.product.id, controller.signal);
          if (!controller.signal.aborted) {
            setProduct(nextProduct);
          }
        } catch (cause: unknown) {
          if (!controller.signal.aborted && !isAbortError(cause)) {
            setProduct(null);
          }
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) {
          return;
        }
        setDetail(null);
        setHistory([]);
        setError(cause instanceof Error ? cause.message : "접수 정보를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [isTechnician, receptionId, validId, version]);

  if (loading && detail === null) {
    return <Notice>접수 정보를 불러오는 중입니다.</Notice>;
  }
  if (detail === null) {
    return <Notice tone="error">{error === "" ? "접수 정보를 찾을 수 없습니다." : error}</Notice>;
  }

  return (
    <div className="space-y-4">
      {notice !== "" && <Notice>{notice}</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      <Panel title="고객 정보">
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
          <Field label="고객명" value={detail.customer.name} />
          <Field label="연락처" value={detail.customer.phone} nowrap />
          <Field label="이메일" value={detail.customer.email} />
          <Field label="우편번호" value={detail.customer.zipcode ?? "-"} />
          <div className="sm:col-span-2">
            <Field label="주소" value={customerAddress(detail)} />
          </div>
        </div>
      </Panel>
      <Panel title="제품 및 접수 정보">
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
          <Field label="제품군" value={product === null ? "-" : categoryLabel(product.category)} />
          <Field label="모델명" value={product?.modelName ?? detail.modelName ?? "-"} />
          <Field label="시리얼번호" value={detail.product.serialNumber} />
          <Field label="구매일" value={formatYearMonthDay(product?.purchasedAt ?? detail.product.purchasedAt)} />
          <Field label="수령 방식" value={returnMethodLabel(detail.returnMethod)} />
          <Field label="접수 날짜" value={formatDateTime(detail.createdAt)} />
          <Field label="접수 직원" value={detail.receptionist?.name ?? "-"} />
          <Field label="담당 기사" value={detail.technician?.name ?? "-"} />
        </div>
      </Panel>
      <Panel title="고장 내용">
        <Field label="고장 증상 요약" value={detail.symptom} />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Note label="고장 증상 상세" value={detail.symptomDetail} />
          <Note label="고객 요청 사항 / 메모" value={detail.memo ?? "-"} />
        </div>
      </Panel>
      <ReceptionEditPanel
        detail={detail}
        onSaved={(message) => {
          setNotice(message);
          setError("");
          setVersion((current) => current + 1);
        }}
      />
      <TechnicianAssignPanel
        detail={detail}
        refreshKey={version}
        onReassigned={(message) => {
          setNotice(message);
          setError("");
          setVersion((current) => current + 1);
        }}
      />
      <StatusPanel detail={detail} history={history} />
      <Panel title="상태 변경 이력">
        {history.length === 0 ? (
          <p className="text-sm text-neutral-500">상태 변경 이력이 없습니다.</p>
        ) : (
          <ul className="space-y-3">
            {history.map((item) => (
              <li key={item.id} className="text-sm">
                <p className="font-medium">
                  {historyStatusLabel(item.fromStatus)} → {historyStatusLabel(item.toStatus)}
                </p>
                <p className="mt-1 text-neutral-500">
                  {formatDateTime(item.createdAt)} · {item.changedBy ?? "-"} · {item.reason ?? "-"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <CustomerLinkPanel receptionId={detail.id} />
      <DocumentSection detail={detail} product={product} />
    </div>
  );
}

const STATUS_TRACK: { label: string; statuses: readonly AsReceptionStatus[] }[] = [
  { label: "접수", statuses: ["RECEIVED"] },
  { label: "점검", statuses: ["INSPECTION"] },
  { label: "견적", statuses: ["AWAITING_QUOTE_APPROVAL"] },
  { label: "수리", statuses: ["AWAITING_REPAIR", "REPAIR_IN_PROGRESS"] },
  { label: "결제", statuses: ["AWAITING_PAYMENT"] },
  { label: "인도", statuses: ["AWAITING_SHIPMENT", "AWAITING_PICKUP"] },
  { label: "완료", statuses: ["COMPLETED"] },
];

const REPAIR_STEP_INDEX = STATUS_TRACK.findIndex((step) => step.label === "수리");

function statusTrackIndex(status: AsReceptionStatus): number {
  const index = STATUS_TRACK.findIndex((step) => step.statuses.includes(status));
  return index === -1 ? 0 : index;
}

function StatusPanel({ detail, history }: { detail: AsReceptionDetail; history: AsStatusHistory[] }) {
  const current = statusTrackIndex(detail.status);
  // 견적 승인 대기에서 결제 대기로 바로 넘어가면 고객이 견적을 거부한 것이다.
  const repairSkipped = history.some((item) =>
    item.fromStatus === "AWAITING_QUOTE_APPROVAL" && item.toStatus === "AWAITING_PAYMENT",
  ) && current > REPAIR_STEP_INDEX;
  const aborted = history.some((item) =>
    (item.fromStatus === "INSPECTION" || item.fromStatus === "WARRANTY_REVIEW")
    && (item.toStatus === "AWAITING_SHIPMENT" || item.toStatus === "AWAITING_PICKUP"),
  );
  const handoffLabel = detail.returnMethod === "PICKUP" ? "수령" : "배송";
  const inset = 50 / STATUS_TRACK.length;
  return (
    <Panel title="접수 상태">
      <div className="relative">
        <div className="absolute top-[7px] h-px bg-neutral-300" style={{ left: `${inset}%`, right: `${inset}%` }} />
        {current > 0 && (
          <div
            className="absolute top-[7px] h-px bg-blue-600"
            style={{ left: `${inset}%`, width: `${(current / (STATUS_TRACK.length - 1)) * (100 - inset * 2)}%` }}
          />
        )}
        <ol className="relative grid grid-cols-7" aria-label="접수 진행">
          {STATUS_TRACK.map((step, index) => {
            const skipped = (repairSkipped && index === REPAIR_STEP_INDEX)
              || (aborted && (step.label === "견적" || step.label === "수리" || step.label === "결제"));
            const reached = !skipped && index <= current;
            const active = !skipped && index === current;
            const label = step.statuses.includes("AWAITING_SHIPMENT") ? handoffLabel : step.label;
            return (
              <li key={step.label} className="flex flex-col items-center gap-2" aria-current={active ? "step" : undefined}>
                {skipped ? (
                  <span className="relative z-10 flex h-3.5 w-3.5 items-center justify-center text-sm font-bold leading-none text-red-600" aria-label="건너뜀">×</span>
                ) : (
                  <span
                    className={
                      reached
                        ? `relative z-10 h-3.5 w-3.5 rounded-full bg-blue-600 ${active ? "ring-2 ring-blue-200 ring-offset-2" : ""}`
                        : "relative z-10 h-3.5 w-3.5 rounded-full bg-neutral-300"
                    }
                  />
                )}
                <span
                  className={
                    skipped
                      ? "text-center text-[11px] leading-tight font-semibold text-red-600"
                      : reached
                        ? `text-center text-[11px] leading-tight ${active ? "font-semibold text-blue-600" : "text-blue-600"}`
                        : "text-center text-[11px] leading-tight text-neutral-500"
                  }
                >
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </Panel>
  );
}

function CustomerLinkPanel({ receptionId }: { receptionId: number }) {
  const [link, setLink] = useState<CustomerPortalLink | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLink(null);
    setError("");
    setCopied(false);
    // 접수 시 발급된 토큰으로 고객 안내 주소를 만든다.
    fetchCustomerPortalLink(receptionId, controller.signal)
      .then((nextLink) => {
        if (!controller.signal.aborted) {
          setLink(nextLink);
        }
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted || isAbortError(cause)) {
          return;
        }
        setError(cause instanceof Error ? cause.message : "고객 안내 링크를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [receptionId]);

  const url = link === null ? "" : customerPortalUrl(link.token);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
      setError("링크를 복사하지 못했습니다.");
    }
  }

  return (
    <Panel
      title="고객 안내 링크"
      action={link === null ? undefined : <Button variant="outline" onClick={() => void copy()}>복사</Button>}
    >
      {link === null && error === "" && <p className="text-sm text-neutral-500">고객 안내 링크를 불러오는 중입니다.</p>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      {link !== null && (
        <div>
          <a href={url} target="_blank" rel="noreferrer" className="break-all text-sm text-blue-700 underline">{url}</a>
          <p className="mt-2 text-xs text-neutral-500">만료 {formatDateTime(link.expiresAt)}</p>
          {copied && <p className="mt-2 text-xs text-blue-700">링크를 복사했습니다.</p>}
        </div>
      )}
    </Panel>
  );
}

function DocumentSection({ detail, product }: { detail: AsReceptionDetail; product: ProductSummary | null }) {
  const [documentKind, setDocumentKind] = useState<DocumentKind | null>(null);
  const record = toDocumentRecord(detail, product);
  return (
    <Panel title="서류 발급">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDocumentKind("receipt")}>접수증</Button>
        <Button variant="outline" onClick={() => setDocumentKind("estimate")}>견적서</Button>
        <Button variant="outline" onClick={() => setDocumentKind("repair")}>수리 내역서</Button>
      </div>
      <p className="mt-3 text-xs text-neutral-500">견적서는 수리비 확정 후, 수리내역서는 수리 완료 후 조회됩니다.</p>
      {documentKind !== null && (
        <DocumentModal
          kind={documentKind}
          receptionId={detail.id}
          record={record}
          onClose={() => setDocumentKind(null)}
        />
      )}
    </Panel>
  );
}

function toDocumentRecord(detail: AsReceptionDetail, product: ProductSummary | null): AsRecord {
  return {
    id: detail.receptionNumber,
    customerName: detail.customer.name,
    phone: detail.customer.phone,
    email: detail.customer.email,
    postalCode: detail.customer.zipcode ?? "",
    address: detail.customer.basicAddress ?? "",
    addressDetail: detail.customer.detailAddress ?? "",
    productGroup: product?.category === "LAPTOP" ? "노트북" : "스마트폰",
    modelName: product?.modelName ?? "",
    serial: detail.product.serialNumber,
    purchasedAt: formatYearMonthDay(product?.purchasedAt ?? detail.product.purchasedAt),
    symptom: detail.symptom,
    symptomDetail: detail.symptomDetail,
    memo: detail.memo ?? "",
    receiveMethod: detail.returnMethod === "PICKUP" ? "방문" : "택배",
    receptionist: detail.receptionist?.name ?? "",
    technician: detail.technician?.name ?? "",
    status: receptionStatusLabel(detail.status),
    receivedAt: formatDateTime(detail.createdAt),
    assignedAt: formatDateTime(detail.createdAt),
    portalToken: "",
  };
}

function customerAddress(detail: AsReceptionDetail): string {
  return `${detail.customer.basicAddress ?? ""} ${detail.customer.detailAddress ?? ""}`.trim() || "-";
}

function Note({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs text-neutral-500">{label}</p>
      <div className="min-h-20 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm break-words">{value}</div>
    </div>
  );
}

function Field({ label, value, nowrap = false }: { label: string; value: string; nowrap?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={nowrap ? "mt-1 text-sm whitespace-nowrap" : "mt-1 text-sm break-words"}>{value || "-"}</p>
    </div>
  );
}
