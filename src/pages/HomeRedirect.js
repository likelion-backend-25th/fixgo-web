import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate } from "react-router";
import { useHydratedSession } from "@/hooks/useHydratedSession";
export function HomeRedirect() {
    const { user, ready } = useHydratedSession();
    if (!ready) {
        return null;
    }
    return _jsx(Navigate, { to: user === null ? "/login" : "/as/list", replace: true });
}
