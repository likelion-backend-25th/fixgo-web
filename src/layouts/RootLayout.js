import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Menu } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router";
import { Button } from "@/components/ui/Button";
import { useHydratedSession } from "@/hooks/useHydratedSession";
import { logoutFromServer } from "@/lib/authApi";
import { AiChatWidget } from "@/layouts/AiChatWidget";
import { Sidebar } from "@/layouts/Sidebar";
import { resolveHeading } from "@/layouts/navigation";
import { ROLE_LABEL } from "@/types/staff";
const HeadingMetaContext = createContext(() => { });
export function useHeadingMeta(meta) {
    const setMeta = useContext(HeadingMetaContext);
    useEffect(() => {
        setMeta(meta);
        return () => setMeta(undefined);
    }, [meta, setMeta]);
}
export function RootLayout() {
    const { user, ready } = useHydratedSession();
    const { pathname } = useLocation();
    const [menuState, setMenuState] = useState({ path: pathname, open: false });
    const [pageMeta, setPageMeta] = useState({ path: pathname });
    const menuOpen = menuState.open && menuState.path === pathname;
    useLayoutEffect(() => {
        const applyScrollbarSize = () => {
            const size = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
            document.documentElement.style.setProperty("--scrollbar-size", `${size}px`);
        };
        applyScrollbarSize();
        const observer = new ResizeObserver(applyScrollbarSize);
        observer.observe(document.body);
        window.addEventListener("resize", applyScrollbarSize);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", applyScrollbarSize);
        };
    }, []);
    const setHeadingMeta = useCallback((meta) => {
        setPageMeta({ path: pathname, meta });
    }, [pathname]);
    function setMenuOpen(open) {
        setMenuState({ path: pathname, open });
    }
    if (!ready) {
        return null;
    }
    if (user === null) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    const heading = resolveHeading(pathname, user.role);
    const meta = pageMeta.path === pathname && pageMeta.meta !== undefined ? pageMeta.meta : heading.meta;
    return (_jsx(HeadingMetaContext.Provider, { value: setHeadingMeta, children: _jsxs("div", { className: "flex min-h-screen bg-neutral-50 text-neutral-900", children: [menuOpen && (_jsx("button", { type: "button", "aria-label": "\uBA54\uB274 \uB2EB\uAE30", className: "fixed inset-0 z-30 bg-neutral-900/30 md:hidden", onClick: () => setMenuOpen(false) })), _jsx(Sidebar, { open: menuOpen, onNavigate: () => setMenuOpen(false) }), _jsxs("div", { className: "flex min-w-0 flex-1 flex-col pl-[var(--scrollbar-size)]", children: [_jsxs("header", { className: "sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur", children: [_jsxs("div", { className: "mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-8 py-3", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-3", children: [_jsx("button", { type: "button", className: "rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 md:hidden", "aria-label": "\uBA54\uB274 \uC5F4\uAE30", onClick: () => setMenuOpen(true), children: _jsx(Menu, { className: "size-4" }) }), _jsxs("div", { className: "flex min-w-0 items-baseline gap-3", children: [_jsx("h1", { className: "shrink-0 text-base font-semibold tracking-tight", children: heading.title }), meta !== undefined && meta !== "" && (_jsx("p", { className: "min-w-0 truncate text-sm text-neutral-500", children: meta }))] })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [_jsxs(Link, { to: "/member/me", className: "flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 hover:bg-neutral-50", children: [_jsx("span", { className: "grid size-8 place-items-center rounded-full bg-blue-600 text-sm font-semibold text-white", children: user.name.slice(0, 1) }), _jsxs("span", { className: "text-right text-sm leading-tight", children: [_jsx("span", { className: "block font-medium", children: user.name }), _jsx("span", { className: "block text-xs text-neutral-500", children: ROLE_LABEL[user.role] })] })] }), _jsx(Button, { variant: "outline", onClick: () => void logoutFromServer(), children: "\uB85C\uADF8\uC544\uC6C3" })] })] }) ] }), _jsx("main", { className: "flex-1", children: _jsx("div", { className: "page-container", children: _jsx(Outlet, {}) }) })] }), user.role === "ADMIN" && _jsx(AiChatWidget, {})] }) }));
}
