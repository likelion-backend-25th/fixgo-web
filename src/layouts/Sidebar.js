import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router";
import { logoutFromServer } from "@/lib/authApi";
import { cn } from "@/lib/cn";
import { useSessionStore } from "@/stores/useSessionStore";
import { isNavActive, NAV_GROUPS } from "@/layouts/navigation";
export function Sidebar({ open, collapsed, onNavigate, onToggle }) {
    const { pathname } = useLocation();
    const user = useSessionStore((state) => state.user);
    const role = user?.role;
    const folded = collapsed && !open;
    const groups = NAV_GROUPS
        .map((group) => ({
        label: group.label,
        items: group.items.filter((item) => role !== undefined && item.roles.includes(role)),
    }))
        .filter((group) => group.items.length > 0);
    return (_jsxs("div", { className: cn("relative shrink-0 transition-[width] duration-200", open
            ? "fixed top-14 bottom-0 z-40 w-56"
            : folded
                ? "hidden w-0 md:block"
                : "hidden w-56 md:block"), children: [_jsxs("aside", { inert: folded ? true : undefined, className: cn("absolute inset-0 flex flex-col overflow-hidden bg-white", folded ? "border-0" : "border-r border-neutral-200"), children: [_jsx("nav", { className: "flex-1 overflow-y-auto overscroll-y-contain py-4", children: groups.map((group, index) => (_jsxs("div", { className: cn("px-2", index > 0 && "mt-3 border-t border-neutral-200 pt-3"), children: [_jsx("p", { className: "px-2 pb-2 text-sm font-semibold text-[#005A9C]", children: group.label }), group.items.map((item) => {
                            const active = isNavActive(pathname, item.to);
                            return (_jsx(Link, { to: item.to, onClick: onNavigate, className: cn("my-0.5 block rounded-md px-2 py-2 text-sm", active
                                    ? "bg-[#E7F4FB] font-semibold text-[#005A9C]"
                                    : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"), children: item.label }, item.label));
                        })] }, group.label))) }), _jsx("button", { type: "button", onClick: () => {
                    void logoutFromServer();
                    onNavigate();
                }, className: "mx-3 mb-3 rounded-lg px-2.5 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800", children: "\uB85C\uADF8\uC544\uC6C3" })] }), _jsx("button", { type: "button", className: cn("fixed top-1/2 z-30 hidden h-20 w-5 -translate-y-1/2 items-center justify-center rounded-r-md border border-neutral-200 bg-white text-neutral-600 transition-[left] duration-200 hover:bg-neutral-50 md:inline-flex", folded ? "left-0" : "left-56"), "aria-label": collapsed ? "\uC0AC\uC774\uB4DC\uBC14 \uD3BC\uCE58\uAE30" : "\uC0AC\uC774\uB4DC\uBC14 \uC811\uAE30", "aria-expanded": !collapsed, onClick: onToggle, children: collapsed ? _jsx(ChevronRight, { className: "size-4" }) : _jsx(ChevronLeft, { className: "size-4" }) })] }));
}
