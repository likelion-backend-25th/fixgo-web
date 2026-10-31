import { useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/Panel";
import { won } from "@/lib/format";
import { findAs, inspectionLines } from "@/mocks/screenData";
import { AsSummary } from "@/pages/as/AsSummary";
import { ProgressTabs } from "@/pages/as/ProgressTabs";

export function RepairPage() {
  const { repairId = "" } = useParams();
  const record = findAs(repairId);
  const [done, setDone] = useState(record?.status === "완료");
  if (record === undefined) {
    return <Notice tone="error">A/S 접수 정보를 찾을 수 없습니다.</Notice>;
  }

  const agreed = record.status === "수리 중" || record.status === "완료";
  const rejected = record.status === "수리 거부";
  const lines = inspectionLines(record).filter((line) => line.kind !== "증상");
  const total = lines.reduce((sum, line) => sum + line.amount, 0);

  return (
    <div className="space-y-4">
      <AsSummary record={record} />
      <ProgressTabs repairId={record.id} current="repair" />
      {rejected && (
        <Notice tone="error">고객이 견적을 거부하여 수리를 진행할 수 없습니다.</Notice>
      )}
      {!rejected && !agreed && (
        <Notice>고객의 견적 승인 전에는 수리 작업을 진행할 수 없습니다.</Notice>
      )}
      {agreed && (
        <section>
          {done && <Notice>수리가 완료되었습니다.</Notice>}
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-neutral-100 text-left">
                <tr>
                  {["구분", "항목", "시간/수량", "단가", "금액"].map((header) => (
                    <th key={header} className="px-3 py-2 font-medium">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} className="border-t border-neutral-200">
                    <td className="px-3 py-2">{line.kind}</td>
                    <td className="px-3 py-2">{line.name}</td>
                    <td className="px-3 py-2">{line.quantityLabel}</td>
                    <td className="px-3 py-2">{line.unitPriceLabel}</td>
                    <td className="px-3 py-2">{won(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-right text-sm font-semibold">최종 수리비 {won(total)}</p>
          <div className="mt-4 flex justify-end">
            <Button disabled={done} onClick={() => setDone(true)}>수리 완료</Button>
          </div>
        </section>
      )}
    </div>
  );
}
