import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { Button } from "@/components/ui/Button";
import { InfoRow, PortalFrame } from "@/pages/portal/PortalFrame";

export function PortalPaymentFailPage() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const code = params.get("code") ?? "";
  const message = params.get("message") ?? "";

  if (code === "PAY_PROCESS_CANCELED") {
    return <Navigate to={`/portal/${token}`} replace />;
  }

  return (
    <PortalFrame>
      <h2 className="text-sm font-semibold text-neutral-900">결제 실패</h2>
      <dl className="mt-2">
        <InfoRow label="코드" value={code === "" ? "—" : code} />
        <InfoRow label="메시지" value={message === "" ? "—" : message} />
      </dl>
      <Button className="mt-5 w-full" variant="outline" onClick={() => navigate(`/portal/${token}`)}>
        포털로 돌아가기
      </Button>
    </PortalFrame>
  );
}
