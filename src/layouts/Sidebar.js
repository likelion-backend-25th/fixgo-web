import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link, useLocation } from "react-router";
import { logoutFromServer } from "@/lib/authApi";
import { cn } from "@/lib/cn";
import { useSessionStore } from "@/stores/useSessionStore";
import { isNavActive, NAV_GROUPS } from "@/layouts/navigation";
export function Sidebar({ open, onNavigate }) {
    const { pathname } = useLocation();
    const user = useSessionStore((state) => state.user);
    const role = user?.role;
    return (_jsxs("aside", { className: cn("w-56 shrink-0 flex-col border-r border-neutral-200 bg-white", open ? "fixed inset-y-0 z-40 flex" : "hidden md:flex"), children: [_jsxs(Link, { to: "/as/list", onClick: onNavigate, className: "flex items-center gap-2.5 border-b border-neutral-200 px-4 py-4", children: [_jsx("span", { className: "grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white", children: "F" }), _jsx("span", { className: "text-base font-semibold tracking-tight text-neutral-900", children: "FixGo" })] }), _jsx("nav", { className: "flex-1 overflow-y-auto px-3 py-3", children: NAV_GROUPS.map((group) => {
                    const items = group.items.filter((item) => role !== undefined && item.roles.includes(role));
                    if (items.length === 0) {
                        return null;
                    }
                    return (_jsxs("div", { className: "mb-2", children: [_jsx("p", { className: "px-2.5 pt-3 pb-1 text-[11px] font-medium tracking-wide text-neutral-400", children: group.label }), items.map((item) => {
                                const active = isNavActive(pathname, item.to);
                                return (_jsx(Link, { to: item.to, onClick: onNavigate, className: cn("my-0.5 block rounded-lg px-2.5 py-2 text-sm", active
                                        ? "bg-blue-600 font-medium text-white"
                                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"), children: item.label }, item.label));
                            })] }, group.label));
                }) }), _jsx("button", { type: "button", onClick: () => {
                    void logoutFromServer();
                    onNavigate();
                }, className: "mx-3 mb-3 rounded-lg px-2.5 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800", children: "\uB85C\uADF8\uC544\uC6C3" })] }));
}
