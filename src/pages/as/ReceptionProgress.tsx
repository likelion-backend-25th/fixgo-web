import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router";
import { Notice } from "@/components/ui/Panel";
import { fetchMyReception } from "@/lib/asReceptionApi";
import type { MyReceptionDetail } from "@/types/asReception";

type RenderReception = (detail: MyReceptionDetail, reload: () => void) => ReactNode;

export function ReceptionProgress({ render }: { render: RenderReception }) {
  const { receptionId } = useParams();
  const id = Number(receptionId);
  if (!Number.isSafeInteger(id) || id < 1) {
    return <Notice tone="error">올바른 접수 ID가 아닙니다.</Notice>;
  }
  return <ReceptionProgressContent key={id} id={id} render={render} />;
}

function ReceptionProgressContent({ id, render }: { id: number; render: RenderReception }) {
  const [record, setRecord] = useState<MyReceptionDetail | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    // 점검과 수리 탭은 같은 기사 전용 접수 상세를 조회한다.
    fetchMyReception(id, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) setRecord(detail);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "접수 정보를 불러오지 못했습니다.");
        }
      });
    return () => controller.abort();
  }, [id, revision]);

  if (error !== "") return <Notice tone="error">{error}</Notice>;
  if (record === null) return <Notice>접수 정보를 불러오는 중입니다.</Notice>;
  return render(record, () => setRevision((current) => current + 1));
}
