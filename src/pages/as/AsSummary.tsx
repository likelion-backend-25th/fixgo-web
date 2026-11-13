import type { ReactNode } from "react";
import { InfoField, Panel } from "@/components/ui/Panel";
import { returnMethodLabel } from "@/lib/asReceptionApi";
import { formatDateTime } from "@/lib/format";
import { useHeadingMeta } from "@/layouts/RootLayout";
import type { AsReceptionDetail } from "@/types/asReception";

export function AsSummary({ record, action }: { record: AsReceptionDetail; action?: ReactNode }) {
  useHeadingMeta(record.receptionNumber);

  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoField label="고객명" value={record.customer.name} />
        <InfoField label="연락처" value={record.customer.phone} />
        <InfoField label="제품" value={record.modelName ?? "-"} />
        <InfoField label="시리얼번호" value={record.product.serialNumber} />
        <InfoField label="고장 증상" value={record.symptom} />
        <InfoField label="수령 방식" value={returnMethodLabel(record.returnMethod)} />
        <InfoField label="접수일" value={formatDateTime(record.createdAt)} />
        <InfoField label="담당 기사" value={record.technician?.name ?? "-"} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <p className="mb-1 text-xs text-neutral-500">고장 증상 상세</p>
          <div className="min-h-24 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">{record.symptomDetail}</div>
        </div>
        <div>
          <p className="mb-1 text-xs text-neutral-500">고객 요청사항</p>
          <div className="min-h-24 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">{record.memo}</div>
        </div>
      </div>
      {action !== undefined && <div className="mt-4 flex justify-end">{action}</div>}
    </Panel>
  );
}
