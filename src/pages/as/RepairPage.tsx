import { useEffect, useState } from "react";
import { Notice } from "@/components/ui/Panel";
import { formatDateTime, won } from "@/lib/format";
import { isAbortError } from "@/lib/apiClient";
import {
  fetchRepairDetail,
  fetchRepairWorks,
  repairDecisionLabel,
  repairStatusLabel,
  warrantyResultLabel,
  type RepairDetail,
  type RepairWork,
} from "@/lib/repair";
import { AsSummary } from "@/pages/as/AsSummary";
import { ProgressTabs } from "@/pages/as/ProgressTabs";
import { ReceptionProgress } from "@/pages/as/ReceptionProgress";
import type { AsReceptionDetail, ReceptionRepair } from "@/types/asReception";

export function RepairPage() {
  return (
    <ReceptionProgress render={({ reception, repair }) => (
      <RepairView reception={reception} repair={repair} />
    )} />
  );
}

function RepairView({ reception, repair }: { reception: AsReceptionDetail; repair: ReceptionRepair | null }) {
  const [detail, setDetail] = useState<RepairDetail | null>(null);
  const [works, setWorks] = useState<RepairWork[]>([]);
  const [loading, setLoading] = useState(repair !== null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (repair === null) {
      return;
    }
    const controller = new AbortController();
    const repairId = repair.id;

    async function loadRepair() {
      setLoading(true);
      setError("");
      setDetail(null);
      setWorks([]);

      try {
        // 접수에 연결된 수리 상세와 작업 내역을 함께 조회한다.
        const [repairResult, workResult] = await Promise.all([
          fetchRepairDetail(repairId, controller.signal),
          fetchRepairWorks(repairId, controller.signal),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        setDetail(repairResult);
        setWorks(workResult);
      } catch (cause: unknown) {
        if (controller.signal.aborted || isAbortError(cause)) {
          return;
        }

        setError(cause instanceof Error ? cause.message : "수리 정보를 불러오지 못했습니다.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadRepair();

    return () => controller.abort();
  }, [repair]);

  const rejected = detail?.status === "REJECTED";
  const agreed = detail?.status === "REPAIRING" || detail?.status === "COMPLETED";
  const completed = detail?.status === "COMPLETED";

  return (
    <div className="space-y-4">
      <AsSummary record={reception} />
      <ProgressTabs receptionId={reception.id} current="repair" />
      {repair === null && <Notice>수리 내역 조회는 아직 연결되지 않았습니다.</Notice>}
      {repair !== null && loading && <Notice>수리 정보를 불러오는 중입니다.</Notice>}
      {error !== "" && <Notice tone="error">{error}</Notice>}
      {detail !== null && (
        <>
          <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">수리 정보</h2>

            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-neutral-500">수리 ID</dt>
                <dd className="mt-1 font-medium">#{detail.id}</dd>
              </div>

              <div>
                <dt className="text-neutral-500">접수 ID</dt>
                <dd className="mt-1 font-medium">#{detail.asReceptionId}</dd>
              </div>

              <div>
                <dt className="text-neutral-500">수리 상태</dt>
                <dd className="mt-1 font-medium">{repairStatusLabel(detail.status)}</dd>
              </div>

              <div>
                <dt className="text-neutral-500">수리 판정</dt>
                <dd className="mt-1 font-medium">{repairDecisionLabel(detail.repairDecision)}</dd>
              </div>

              <div>
                <dt className="text-neutral-500">보증 결과</dt>
                <dd className="mt-1 font-medium">{warrantyResultLabel(detail.warrantyResult)}</dd>
              </div>

              <div>
                <dt className="text-neutral-500">담당 기사 ID</dt>
                <dd className="mt-1 font-medium">{detail.technicianId}</dd>
              </div>

              <div>
                <dt className="text-neutral-500">등록일</dt>
                <dd className="mt-1 font-medium">{formatDateTime(detail.createdAt)}</dd>
              </div>

              <div>
                <dt className="text-neutral-500">수정일</dt>
                <dd className="mt-1 font-medium">{formatDateTime(detail.updatedAt)}</dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-neutral-200 pt-4">
              <h3 className="mb-2 font-medium">진단 내용</h3>
              <p className="whitespace-pre-wrap text-sm text-neutral-700">
                {detail.diagnosis || "등록된 진단 내용이 없습니다."}
              </p>
            </div>

            <div className="mt-4">
              <h3 className="mb-2 font-medium">수리 내용</h3>
              <p className="whitespace-pre-wrap text-sm text-neutral-700">
                {detail.workNote || "등록된 수리 내용이 없습니다."}
              </p>
            </div>

            {detail.reason && (
              <div className="mt-4">
                <h3 className="mb-2 font-medium">판정 사유</h3>
                <p className="whitespace-pre-wrap text-sm text-neutral-700">{detail.reason}</p>
              </div>
            )}

            {detail.reasonForRejection && (
              <div className="mt-4">
                <h3 className="mb-2 font-medium">반려 사유</h3>
                <p className="whitespace-pre-wrap text-sm text-red-600">{detail.reasonForRejection}</p>
              </div>
            )}
          </section>

          {rejected && (
            <Notice tone="error">수리가 반려된 건입니다. 수리 작업을 진행할 수 없습니다.</Notice>
          )}

          {!rejected && !agreed && (
            <Notice>현재 상태에서는 수리 작업을 진행할 수 없습니다. 수리 시작 처리가 필요합니다.</Notice>
          )}

          {completed && <Notice>수리가 완료된 건입니다.</Notice>}

          {agreed && (
            <section className="space-y-4">
              <div>
                <h2 className="mb-3 text-lg font-semibold">수리 작업 내역</h2>

                <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
                  <table className="w-full min-w-[480px] text-sm">
                    <thead className="bg-neutral-100 text-left">
                      <tr>
                        <th className="px-3 py-3 font-medium">작업명</th>
                        <th className="px-3 py-3 font-medium">프리셋</th>
                        <th className="px-3 py-3 font-medium">등록일</th>
                      </tr>
                    </thead>

                    <tbody>
                      {works.length > 0 ? (
                        works.map((work) => (
                          <tr key={work.id} className="border-t border-neutral-200">
                            <td className="px-3 py-3">{work.workName}</td>
                            <td className="px-3 py-3">{work.repairPresetName ?? "-"}</td>
                            <td className="px-3 py-3">{formatDateTime(work.createdAt)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-3 py-6 text-center text-neutral-500">
                            등록된 수리 작업이 없습니다.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <h2 className="mb-3 font-semibold">수리비 내역</h2>

                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-neutral-500">공임비</dt>
                    <dd>{won(detail.laborRate)}</dd>
                  </div>

                  <div className="flex justify-between">
                    <dt className="text-neutral-500">점검비</dt>
                    <dd>{won(detail.inspectionCost)}</dd>
                  </div>

                  <div className="flex justify-between border-t border-neutral-200 pt-3 font-semibold">
                    <dt>최종 수리비</dt>
                    <dd>{won(detail.finalAmount)}</dd>
                  </div>
                </dl>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
