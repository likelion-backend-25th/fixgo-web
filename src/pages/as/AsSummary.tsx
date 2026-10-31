import { InfoField, Panel } from "@/components/ui/Panel";
import type { AsRecord } from "@/types/screen";

export function AsSummary({ record }: { record: AsRecord }) {
  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoField label="고객명" value={record.customerName} />
        <InfoField label="연락처" value={record.phone} />
        <InfoField label="제품" value={`${record.productGroup} ${record.modelName}`} />
        <InfoField label="시리얼번호" value={record.serial} />
        <InfoField label="고장 증상" value={record.symptom} />
        <InfoField label="수령 방식" value={record.receiveMethod} />
        <InfoField label="접수일" value={record.receivedAt} />
        <InfoField label="담당 기사" value={record.technician} />
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
    </Panel>
  );
}
