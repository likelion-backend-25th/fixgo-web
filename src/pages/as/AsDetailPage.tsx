import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { SelectBox, TextField } from "@/components/ui/Field";
import { Notice, Panel } from "@/components/ui/Panel";
import { isAbortError } from "@/lib/apiClient";
import {
  categoryLabel,
  changeReceptionStatus,
  fetchProduct,
  fetchReception,
  fetchReceptionHistory,
  historyStatusLabel,
  isReceptionStatus,
  receptionStatusLabel,
  returnMethodLabel,
} from "@/lib/asReceptionApi";
import { formatDate, formatDateTime } from "@/lib/format";
import { readNotice } from "@/lib/guards";
import { DocumentModal, type DocumentKind } from "@/pages/as/DocumentModal";
import { AS_RECEPTION_STATUSES, type AsReceptionDetail, type AsReceptionStatus, type AsStatusHistory, type ProductSummary } from "@/types/asReception";
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

  useEffect(() => {
    if (!validId) {
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError("");

    // 상세와 이력을 같이 읽고, 모델명은 제품 API로 보완한다.
    Promise.all([fetchReception(receptionId, controller.signal), fetchReceptionHistory(receptionId, controller.signal)])
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
  }, [receptionId, validId, version]);

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
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="접수번호" value={detail.receptionNumber} />
          <Field label="고객명" value={detail.customer.name} />
          <Field label="연락처" value={detail.customer.phone} />
          <Field label="이메일" value={detail.customer.email} />
          <Field label="우편번호" value={detail.customer.zipcode ?? "-"} />
          <Field label="주소" value={`${detail.customer.basicAddress ?? ""} ${detail.customer.detailAddress ?? ""}`.trim() || "-"} />
          <Field label="제품군" value={product === null ? "-" : categoryLabel(product.category)} />
          <Field label="모델명" value={product?.modelName ?? "-"} />
          <Field label="시리얼번호" value={detail.product.serialNumber} />
          <Field label="구매일" value={formatDate(product?.purchasedAt ?? detail.product.purchasedAt)} />
          <Field label="수령 방식" value={returnMethodLabel(detail.returnMethod)} />
          <Field label="상태" value={receptionStatusLabel(detail.status)} />
          <Field label="증상 요약" value={detail.symptom} />
          <Field label="접수 직원" value={detail.receptionist?.name ?? "-"} />
          <Field label="담당 기사" value={detail.technician?.name ?? "-"} />
          <Field label="접수 날짜" value={formatDateTime(detail.createdAt)} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-neutral-500">고장 증상 상세</p>
            <div className="min-h-20 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">{detail.symptomDetail}</div>
          </div>
          <div>
            <p className="mb-1 text-xs text-neutral-500">고객 요청 사항 / 메모</p>
            <div className="min-h-20 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">{detail.memo ?? "-"}</div>
          </div>
        </div>
      </Panel>
      <StatusPanel
        detail={detail}
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
      <DocumentSection detail={detail} product={product} />
    </div>
  );
}

function StatusPanel({
  detail,
  onChanged,
  onError,
}: {
  detail: AsReceptionDetail;
  onChanged: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [nextStatus, setNextStatus] = useState<AsReceptionStatus>(detail.status);
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setNextStatus(detail.status);
  }, [detail.status]);

  async function save() {
    setPending(true);
    try {
      await changeReceptionStatus(detail.id, nextStatus, reason);
      setReason("");
      onChanged(`${receptionStatusLabel(nextStatus)} 상태로 변경했습니다.`);
    } catch (cause: unknown) {
      onError(cause instanceof Error ? cause.message : "접수 상태를 변경하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title="접수 상태" action={<Button onClick={() => void save()} disabled={pending}>상태 변경</Button>}>
      <div className="flex flex-wrap items-end gap-2">
        <SelectBox
          value={nextStatus}
          onChange={(value) => {
            if (isReceptionStatus(value)) {
              setNextStatus(value);
            }
          }}
          options={AS_RECEPTION_STATUSES.map((status) => ({ value: status, label: receptionStatusLabel(status) }))}
        />
        <TextField className="w-72" value={reason} onChange={setReason} placeholder="변경 사유" />
      </div>
    </Panel>
  );
}

function DocumentSection({ detail, product }: { detail: AsReceptionDetail; product: ProductSummary | null }) {
  const [documentKind, setDocumentKind] = useState<DocumentKind | null>(null);
  const record = toDocumentRecord(detail, product);
  return (
    <Panel title="서류 발급">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setDocumentKind("receipt")}>접수증 출력</Button>
        <Button variant="outline" onClick={() => setDocumentKind("estimate")}>견적서</Button>
        <Button variant="outline" onClick={() => setDocumentKind("repair")}>수리 내역서</Button>
        <Button variant="outline" onClick={() => setDocumentKind("payment")}>결제 내역서</Button>
      </div>
      <p className="mt-3 text-xs text-neutral-500">견적, 수리, 결제 전에는 해당 서류가 비어 있습니다.</p>
      {documentKind !== null && <DocumentModal kind={documentKind} record={record} onClose={() => setDocumentKind(null)} />}
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
    purchasedAt: formatDate(product?.purchasedAt ?? detail.product.purchasedAt),
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm">{value || "-"}</p>
    </div>
  );
}
