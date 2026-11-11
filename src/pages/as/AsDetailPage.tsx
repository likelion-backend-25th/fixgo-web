import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Notice, Panel } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import {
  categoryLabel,
  changeReceptionStatus,
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
import type { AsReceptionDetail, AsStatusHistory, CustomerPortalLink, ProductSummary } from "@/types/asReception";
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
  const memberId = useSessionStore((state) => state.memberId);
  const isTechnician = role === "TECHNICIAN";
  useHeadingMeta(detail?.receptionNumber);

  useEffect(() => {
    if (!validId) {
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");

    // 상세와 이력을 같이 읽고, 모델명은 제품 API로 보완한다. 기사 화면은 이력을 쓰지 않는다.
    Promise.all([
      isTechnician
        ? fetchMyReception(receptionId, controller.signal).then((record) => record.reception)
        : fetchReception(receptionId, controller.signal),
      isTechnician ? Promise.resolve([]) : fetchReceptionHistory(receptionId, controller.signal),
    ])
      .then(async ([nextDetail, nextHistory]) => {
        if (controller.signal.aborted) {
          return;
        }
        setDetail(nextDetail);
        setHistory(nextHistory);
        try {
          const nextProduct = await fetchProduct(nextDetail.product.id, controller.signal);
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
      {isTechnician ? (
        <TechnicianSummary detail={detail} productName={product?.modelName ?? detail.modelName ?? "-"} />
      ) : (
        <Panel>
          <div className="space-y-4">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-[max-content_max-content_minmax(0,1.3fr)_max-content_minmax(0,1.8fr)]">
              <Field label="고객명" value={detail.customer.name} />
              <Field label="연락처" value={detail.customer.phone} nowrap />
              <Field label="이메일" value={detail.customer.email} />
              <Field label="우편번호" value={detail.customer.zipcode ?? "-"} />
              <Field label="주소" value={`${detail.customer.basicAddress ?? ""} ${detail.customer.detailAddress ?? ""}`.trim() || "-"} />
              <Field label="제품군" value={product === null ? "-" : categoryLabel(product.category)} />
              <Field label="모델명" value={product?.modelName ?? "-"} />
              <Field label="시리얼번호" value={detail.product.serialNumber} />
              <Field label="구매일" value={formatYearMonthDay(product?.purchasedAt ?? detail.product.purchasedAt)} />
              <Field label="수령 방식" value={returnMethodLabel(detail.returnMethod)} />
              <div className="lg:col-span-2">
                <Field label="증상 요약" value={detail.symptom} />
              </div>
              <Field label="접수 직원" value={detail.receptionist?.name ?? "-"} />
              <Field label="담당 기사" value={detail.technician?.name ?? "-"} />
              <Field label="접수 날짜" value={formatDateTime(detail.createdAt)} />
              <div className="min-w-0 sm:col-span-2 lg:col-span-3">
                <p className="mb-1 text-xs text-neutral-500">고장 증상 상세</p>
                <div className="min-h-20 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm break-words">{detail.symptomDetail}</div>
              </div>
              <div className="min-w-0 lg:col-span-2">
                <p className="mb-1 text-xs text-neutral-500">고객 요청 사항 / 메모</p>
                <div className="min-h-20 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm break-words">{detail.memo ?? "-"}</div>
              </div>
            </div>
          </div>
        </Panel>
      )}
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
      {!isTechnician && (
        <>
          {(role === "ADMIN" || role === "MANAGER") && (
            <Link className="text-sm font-medium text-blue-600 hover:underline" to={`/as/${detail.id}/repair`}>
              수리 진행 보기
            </Link>
          )}
          <StatusPanel
            detail={detail}
            canChange={role === "ADMIN" || (role === "RECEPTIONIST" && detail.receptionist?.id === memberId)}
            onChanged={(message) => {
              setNotice(message);
              setError("");
              setVersion((current) => current + 1);
            }}
            onError={setError}
          />
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
        </>
      )}
    </div>
  );
}

function StatusPanel({
  detail,
  canChange,
  onChanged,
  onError,
}: {
  detail: AsReceptionDetail;
  canChange: boolean;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    try {
      await changeReceptionStatus(detail.id, "WARRANTY_REVIEW", reason);
      setReason("");
      onChanged("보증 판정 상태로 변경했습니다.");
    } catch (cause: unknown) {
      onError(cause instanceof Error ? cause.message : "접수 상태를 변경하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title="접수 상태">
      <p className="text-sm">현재 상태 {receptionStatusLabel(detail.status)}</p>
      <p className="mt-2 text-sm text-neutral-500">
        점검 중이고 점검 기록이 있는 건만 보증 판정으로 바꿀 수 있습니다. 수리, 결제, 배송, 완료는 각 업무 화면에서 함께 처리됩니다.
      </p>
      {canChange && detail.status === "INSPECTION" && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <TextField className="w-72" value={reason} onChange={setReason} placeholder="변경 사유" />
          <Button onClick={() => void save()} disabled={pending}>보증 판정으로 변경</Button>
        </div>
      )}
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

function TechnicianSummary({ detail, productName }: { detail: AsReceptionDetail; productName: string }) {
  return (
    <Panel>
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-x-6">
          <Field label="고객명" value={detail.customer.name} />
          <Field label="연락처" value={detail.customer.phone} nowrap />
          <Field label="제품" value={productName} />
          <Field label="시리얼번호" value={detail.product.serialNumber} />
        </div>
        <div className="grid grid-cols-4 gap-x-6">
          <Field label="고장 증상" value={detail.symptom} />
          <Field label="수령 방식" value={returnMethodLabel(detail.returnMethod)} />
          <Field label="접수일" value={formatDateTime(detail.createdAt)} />
          <Field label="담당 기사" value={detail.technician?.name ?? "-"} />
        </div>
        <div className="grid grid-cols-2 gap-x-6">
          <Note label="고장 증상 상세" value={detail.symptomDetail} />
          <Note label="고객 요청 사항 / 메모" value={detail.memo ?? "-"} />
        </div>
      </div>
    </Panel>
  );
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
