import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "react-router";
import { Notice } from "@/components/ui/Panel";
import { fetchMyReception, fetchStaffReception } from "@/lib/asReceptionApi";
import { useSessionStore } from "@/stores/useSessionStore";
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
  const role = useSessionStore((state) => state.user?.role);
  const [record, setRecord] = useState<MyReceptionDetail | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    const fetchProgress = role === "TECHNICIAN" ? fetchMyReception : fetchStaffReception;
    fetchProgress(id, controller.signal)
      .then((detail) => {
        if (!controller.signal.aborted) setRecord(detail);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "접수 정보를 불러오지 못했습니다.");
        }
      });
    return () => controller.abort();
  }, [id, revision, role]);

  if (error !== "") return <Notice tone="error">{error}</Notice>;
  if (record === null) return <Notice>접수 정보를 불러오는 중입니다.</Notice>;
  return render(record, () => setRevision((current) => current + 1));
}
