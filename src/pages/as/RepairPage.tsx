
import { useEffect, useState } from "react";
import { useParams } from "react-router";
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
import { ProgressTabs } from "@/pages/as/ProgressTabs";

export function RepairPage() {
  const { repairId = "" } = useParams();

  const [repair, setRepair] = useState<RepairDetail | null>(null);
  const [works, setWorks] = useState<RepairWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const id = Number(repairId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      setError("올바르지 않은 수리 ID입니다.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function loadRepair() {
      setLoading(true);
      setError("");
      setRepair(null);
      setWorks([]);

      try {
        // 수리 상세 정보와 해당 수리의 작업 내역을 함께 조회
        const [repairResult, workResult] = await Promise.all([
          fetchRepairDetail(id, controller.signal),
          fetchRepairWorks(id, controller.signal),
        ]);

        if (controller.signal.aborted) return;

        setRepair(repairResult);
        setWorks(workResult);
      } catch (cause: unknown) {
        if (controller.signal.aborted || isAbortError(cause)) return;

        setError(
          cause instanceof Error
            ? cause.message
            : "수리 정보를 불러오지 못했습니다.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadRepair();

    return () => controller.abort();
  }, [repairId]);

  if (loading) {
    return <Notice>수리 정보를 불러오는 중입니다.</Notice>;
  }

  if (error !== "") {
    return <Notice tone="error">{error}</Notice>;
  }

  if (repair === null) {
    return <Notice tone="error">수리 정보를 찾을 수 없습니다.</Notice>;
  }

  const rejected = repair.status === "REJECTED";
  const agreed =
    repair.status === "REPAIRING" ||
    repair.status === "COMPLETED";
  const completed = repair.status === "COMPLETED";

  return (
    <div className="space-y-4">
      {/* 수리 상세 정보 */}
      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">수리 정보</h2>

        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-neutral-500">수리 ID</dt>
            <dd className="mt-1 font-medium">#{repair.id}</dd>
          </div>

          <div>
            <dt className="text-neutral-500">접수 ID</dt>
            <dd className="mt-1 font-medium">#{repair.asReceptionId}</dd>
          </div>

          <div>
            <dt className="text-neutral-500">수리 상태</dt>
            <dd className="mt-1 font-medium">
              {repairStatusLabel(repair.status)}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">수리 판정</dt>
            <dd className="mt-1 font-medium">
              {repairDecisionLabel(repair.repairDecision)}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">보증 결과</dt>
            <dd className="mt-1 font-medium">
              {warrantyResultLabel(repair.warrantyResult)}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">담당 기사 ID</dt>
            <dd className="mt-1 font-medium">{repair.technicianId}</dd>
          </div>

          <div>
            <dt className="text-neutral-500">등록일</dt>
            <dd className="mt-1 font-medium">
              {formatDateTime(repair.createdAt)}
            </dd>
          </div>

          <div>
            <dt className="text-neutral-500">수정일</dt>
            <dd className="mt-1 font-medium">
              {formatDateTime(repair.updatedAt)}
            </dd>
          </div>
        </dl>

        <div className="mt-4 border-t border-neutral-200 pt-4">
          <h3 className="mb-2 font-medium">진단 내용</h3>
          <p className="whitespace-pre-wrap text-sm text-neutral-700">
            {repair.diagnosis || "등록된 진단 내용이 없습니다."}
          </p>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 font-medium">수리 내용</h3>
          <p className="whitespace-pre-wrap text-sm text-neutral-700">
            {repair.workNote || "등록된 수리 내용이 없습니다."}
          </p>
        </div>

        {repair.reason && (
          <div className="mt-4">
            <h3 className="mb-2 font-medium">판정 사유</h3>
            <p className="whitespace-pre-wrap text-sm text-neutral-700">
              {repair.reason}
            </p>
          </div>
        )}

        {repair.reasonForRejection && (
          <div className="mt-4">
            <h3 className="mb-2 font-medium">반려 사유</h3>
            <p className="whitespace-pre-wrap text-sm text-red-600">
              {repair.reasonForRejection}
            </p>
          </div>
        )}
      </section>

      <ProgressTabs repairId={String(repair.id)} current="repair" />

      {rejected && (
        <Notice tone="error">
          수리가 반려된 건입니다. 수리 작업을 진행할 수 없습니다.
        </Notice>
      )}

      {!rejected && !agreed && (
        <Notice>
          현재 상태에서는 수리 작업을 진행할 수 없습니다.
          수리 시작 처리가 필요합니다.
        </Notice>
      )}

      {completed && (
        <Notice>수리가 완료된 건입니다.</Notice>
      )}

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
                      <tr
                        key={work.id}
                        className="border-t border-neutral-200"
                      >
                        <td className="px-3 py-3">{work.workName}</td>
                        <td className="px-3 py-3">
                          {work.repairPresetName ?? "-"}
                        </td>
                        <td className="px-3 py-3">
                          {formatDateTime(work.createdAt)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className="px-3 py-6 text-center text-neutral-500"
                      >
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
                <dd>{won(repair.laborRate)}</dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-neutral-500">점검비</dt>
                <dd>{won(repair.inspectionCost)}</dd>
              </div>

              <div className="flex justify-between border-t border-neutral-200 pt-3 font-semibold">
                <dt>최종 수리비</dt>
                <dd>{won(repair.finalAmount)}</dd>
              </div>
            </dl>
          </div>
        </section>
      )}
    </div>
  );
}
