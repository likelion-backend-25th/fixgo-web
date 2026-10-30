import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Notice, Panel } from "@/components/ui/Panel";
import { readNotice } from "@/lib/guards";
import { won } from "@/lib/format";
import { findAs, pastRepairs, payments, technicians } from "@/mocks/screenData";
import { DocumentModal, type DocumentKind } from "@/pages/as/DocumentModal";
import type { AsRecord } from "@/types/screen";

export function AsDetailPage() {
  const { asRequestId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const draft = readAsDraft(location.state);
  const base = findAs(asRequestId);
  const record = base ?? (draft === null ? undefined : draftToRecord(asRequestId, draft));
  const [technician, setTechnician] = useState(record?.technician ?? "");
  const [techOpen, setTechOpen] = useState(false);
  const [documentKind, setDocumentKind] = useState<DocumentKind | null>(null);
  const [notice, setNotice] = useState(readNotice(location.state) ?? "");

  if (record === undefined) {
    return <Notice tone="error">접수 정보를 찾을 수 없습니다.</Notice>;
  }

  const history = pastRepairs(record.customerName).filter((row) => row.id !== record.id);
  const columns: Column<(typeof history)[number]>[] = [
    { key: "id", header: "접수번호", render: (row) => row.id },
    { key: "date", header: "접수일", render: (row) => row.receivedAt },
    { key: "model", header: "모델명", render: (row) => row.modelName },
    { key: "symptom", header: "고장증상", render: (row) => row.symptom },
    { key: "tech", header: "담당기사", render: (row) => row.technician },
    { key: "amount", header: "수리금액", render: (row) => (row.amount === 0 ? "-" : won(row.amount)) },
    { key: "status", header: "상태", render: (row) => row.status },
    {
      key: "link",
      header: "",
      render: (row) => {
        const payment = payments.find((item) => item.asId === row.id);
        if (payment === undefined) {
          return "-";
        }
        return (
          <Link className="text-blue-600" to={`/payment/${payment.orderId}`}>
            결제 상세
          </Link>
        );
      },
    },
  ];
  const portalUrl = `${window.location.origin}/${record.portalToken}`;

  return (
    <div className="space-y-4">
      {notice !== "" && <Notice>{notice}</Notice>}
      <div className="flex justify-end">
        <Button onClick={() => navigate("/as/new")}>접수 수정</Button>
      </div>
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="고객명" value={record.customerName} />
          <Field label="연락처" value={record.phone} />
          <Field label="이메일" value={record.email} />
          <Field label="우편번호" value={record.postalCode} />
          <Field label="주소" value={`${record.address} ${record.addressDetail}`} />
          <Field label="제품군" value={record.productGroup} />
          <Field label="모델명" value={record.modelName} />
          <Field label="시리얼번호" value={record.serial} />
          <Field label="구매일" value={record.purchasedAt} />
          <Field label="수령 방식" value={record.receiveMethod} />
          <Field label="증상 요약" value={record.symptom} />
          <Field label="접수 직원" value={record.receptionist} />
          <Field label="접수 날짜" value={record.receivedAt} />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-neutral-500">고장 증상 상세</p>
            <div className="min-h-20 rounded border border-neutral-300 p-3 text-sm">{record.symptomDetail}</div>
          </div>
          <div>
            <p className="mb-1 text-xs text-neutral-500">고객 요청 사항 / 메모</p>
            <div className="min-h-20 rounded border border-neutral-300 p-3 text-sm">{record.memo}</div>
          </div>
        </div>
      </Panel>
      <Panel title="담당 기사 배정" action={<Button onClick={() => setNotice(`${technician} 기사로 배정을 저장했습니다.`)}>배정 저장</Button>}>
        <div className="flex items-center gap-2">
          <div className="min-w-40 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm">{technician}</div>
          <Button variant="outline" onClick={() => setTechOpen(true)}>A/S 기사 목록 조회</Button>
        </div>
      </Panel>
      <Panel title="환불">
        <p className="text-sm">보증기간 내 동일 증상이 3회 이상 발생되었기에 운영 정책에 의하여 환불 진행합니다.</p>
        <p className="mt-4 mb-2 text-sm font-medium">과거 동일증상 접수 내역</p>
        <DataTable columns={columns} rows={history} rowKey={(row) => row.id} emptyText="과거 동일 증상 이력이 없습니다." />
      </Panel>
      <Panel title="고객 안내 링크">
        <p className="text-sm break-all">{portalUrl}</p>
        <p className="mt-1 text-xs text-neutral-500">발급됨 · 만료 2026-11-06</p>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(portalUrl);
              setNotice("고객 안내 링크를 복사했습니다.");
            }}
          >
            링크 복사
          </Button>
          <Button variant="outline" onClick={() => setNotice("고객 안내 링크를 발송했습니다.")}>알림 보내기</Button>
        </div>
      </Panel>
      <Panel title="서류 발급">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setDocumentKind("receipt")}>접수증 출력</Button>
          <Button variant="outline" onClick={() => setDocumentKind("estimate")}>견적서</Button>
          <Button variant="outline" onClick={() => setDocumentKind("repair")}>수리 내역서</Button>
          <Button variant="outline" onClick={() => setDocumentKind("payment")}>결제 내역서</Button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">견적, 수리, 결제 전에는 해당 서류가 비어 있습니다.</p>
      </Panel>
      {techOpen && (
        <TechPick
          onClose={() => setTechOpen(false)}
          onPick={(name) => {
            setTechnician(name);
            setTechOpen(false);
          }}
        />
      )}
      {documentKind !== null && <DocumentModal kind={documentKind} record={record} onClose={() => setDocumentKind(null)} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-1 text-sm">{value || "-"}</p>
    </div>
  );
}

function TechPick({ onClose, onPick }: { onClose: () => void; onPick: (name: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded bg-white p-4" onClick={(event) => event.stopPropagation()}>
        <h2 className="mb-3 font-semibold">A/S 기사 목록</h2>
        <ul className="divide-y divide-neutral-200 border border-neutral-300">
          {technicians.map((row) => (
            <li key={row.email}>
              <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50" onClick={() => onPick(row.name)}>
                {row.name} · 점검 {row.waiting} · 수리 {row.repairing} · {row.status}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function readAsDraft(value: unknown): Partial<AsRecord> | null {
  if (typeof value !== "object" || value === null || !("draft" in value)) {
    return null;
  }
  const draft = value.draft;
  if (typeof draft !== "object" || draft === null || !("customerName" in draft)) {
    return null;
  }
  return draft as Partial<AsRecord>;
}

function draftToRecord(id: string, draft: Partial<AsRecord>): AsRecord {
  return {
    id,
    customerName: draft.customerName ?? "",
    phone: draft.phone ?? "",
    email: draft.email ?? "",
    postalCode: draft.postalCode ?? "",
    address: draft.address ?? "",
    addressDetail: draft.addressDetail ?? "",
    productGroup: draft.productGroup === "노트북" ? "노트북" : "스마트폰",
    modelName: draft.modelName ?? "",
    serial: draft.serial ?? "",
    purchasedAt: draft.purchasedAt ?? "",
    symptom: draft.symptom ?? "",
    symptomDetail: draft.symptomDetail ?? "",
    memo: draft.memo ?? "",
    receiveMethod: draft.receiveMethod === "택배" ? "택배" : "방문",
    receptionist: "최미소",
    technician: draft.technician ?? "",
    status: "접수",
    receivedAt: "2026-10-30",
    assignedAt: "2026-10-30",
    portalToken: "sahd123dh128ds23w4a1",
  };
}
