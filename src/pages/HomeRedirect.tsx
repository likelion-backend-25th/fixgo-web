import { Navigate } from "react-router";
import { useHydratedSession } from "@/hooks/useHydratedSession";

export function HomeRedirect() {
  const { user, ready } = useHydratedSession();
  if (!ready) {
    return null;
  }
  return <Navigate to={user === null ? "/login" : "/as/list"} replace />;
}
