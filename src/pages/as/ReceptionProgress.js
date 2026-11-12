import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Notice } from "@/components/ui/Panel";
import { fetchMyReception, fetchStaffReception } from "@/lib/asReceptionApi";
import { useSessionStore } from "@/stores/useSessionStore";
export function ReceptionProgress({ render }) {
    const { receptionId } = useParams();
    const id = Number(receptionId);
    if (!Number.isSafeInteger(id) || id < 1) {
        return _jsx(Notice, { tone: "error", children: "\uC62C\uBC14\uB978 \uC811\uC218 ID\uAC00 \uC544\uB2D9\uB2C8\uB2E4." });
    }
    return _jsx(ReceptionProgressContent, { id: id, render: render }, id);
}
function ReceptionProgressContent({ id, render }) {
    const role = useSessionStore((state) => state.user?.role);
    const [record, setRecord] = useState(null);
    const [revision, setRevision] = useState(0);
    const [error, setError] = useState("");
    useEffect(() => {
        const controller = new AbortController();
        setError("");
        const fetchProgress = role === "TECHNICIAN" ? fetchMyReception : fetchStaffReception;
        fetchProgress(id, controller.signal)
            .then((detail) => {
            if (!controller.signal.aborted)
                setRecord(detail);
        })
            .catch((cause) => {
            if (!controller.signal.aborted) {
                setError(cause instanceof Error ? cause.message : "접수 정보를 불러오지 못했습니다.");
            }
        });
        return () => controller.abort();
    }, [id, revision, role]);
    if (error !== "")
        return _jsx(Notice, { tone: "error", children: error });
    if (record === null)
        return _jsx(Notice, { children: "\uC811\uC218 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911\uC785\uB2C8\uB2E4." });
    return render(record, () => setRevision((current) => current + 1));
}
