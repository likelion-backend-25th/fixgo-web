import { Menu } from "lucide-react";
import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router";
import { Button } from "@/components/ui/Button";
import { useHydratedSession } from "@/hooks/useHydratedSession";
import { logoutFromServer } from "@/lib/authApi";
import { AiChatWidget } from "@/layouts/AiChatWidget";
import { Sidebar } from "@/layouts/Sidebar";
import { resolveHeading } from "@/layouts/navigation";
import { ROLE_LABEL } from "@/types/staff";

const HeadingMetaContext = createContext<(owner: symbol, meta: string | undefined) => void>(() => {});
const SIDEBAR_KEY = "fixgo-sidebar-collapsed";

export function useHeadingMeta(meta: string | undefined) {
  const setMeta = useContext(HeadingMetaContext);
  const owner = useRef(Symbol("heading")).current;

  useLayoutEffect(() => {
    setMeta(owner, meta);
    return () => setMeta(owner, undefined);
  }, [meta, owner, setMeta]);
}

export function RootLayout() {
  const { user, ready } = useHydratedSession();
  const { pathname } = useLocation();
  const [menuState, setMenuState] = useState({ path: pathname, open: false });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(readSidebarCollapsed);
  const [pageMeta, setPageMeta] = useState<string | undefined>(undefined);
  const metaOwner = useRef<symbol | null>(null);
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
  // 화면을 떠나는 정리가 다음 화면보다 늦게 실행돼도, 지금 화면의 접수번호는 남긴다.
  const setHeadingMeta = useCallback((owner: symbol, meta: string | undefined) => {
    if (meta === undefined || meta === "") {
      if (metaOwner.current !== owner) return;
      metaOwner.current = null;
      setPageMeta(undefined);
      return;
    }
    metaOwner.current = owner;
    setPageMeta(meta);
  }, []);

  function setMenuOpen(open: boolean) {
    setMenuState({ path: pathname, open });
  }

  function toggleSidebar() {
    setSidebarCollapsed((current) => {
      const next = !current;
      localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      return next;
    });
  }

  if (!ready) {
    return null;
  }
  if (user === null) {
    return <Navigate to="/login" replace />;
  }

  const heading = resolveHeading(pathname, user.role);
  const meta = pageMeta !== undefined && pageMeta !== "" ? pageMeta : heading.meta;

  return (
    <HeadingMetaContext.Provider value={setHeadingMeta}>
    <div className="flex h-dvh flex-col overflow-hidden bg-neutral-50 text-neutral-900 print:h-auto print:overflow-visible">
      {menuOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="fixed inset-x-0 top-14 bottom-0 z-30 bg-neutral-900/30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <header className="sticky top-0 z-40 flex h-14 w-full shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white/90 px-8 backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/as/list" className="flex shrink-0 items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                F
              </span>
              <span className="text-base font-semibold tracking-tight text-neutral-900">FixGo</span>
            </Link>
            <button
              type="button"
              className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 md:hidden"
              aria-label="메뉴 열기"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-4" />
            </button>
            <div className="flex min-w-0 items-baseline gap-3">
              <h1 className="shrink-0 text-base font-semibold tracking-tight">{heading.title}</h1>
              {meta !== undefined && meta !== "" && (
                <p className="min-w-0 truncate text-sm text-neutral-500">{meta}</p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/member/me"
              className="rounded-lg px-2 py-1 hover:bg-neutral-50"
            >
              <span className="text-right text-sm leading-tight">
                <span className="block font-medium">{user.name}</span>
                <span className="block text-xs text-neutral-500">{ROLE_LABEL[user.role]}</span>
              </span>
            </Link>
            <Button variant="outline" onClick={() => void logoutFromServer()}>로그아웃</Button>
          </div>
      </header>
      <div className="flex min-h-0 flex-1 overflow-hidden print:overflow-visible">
      <Sidebar
        open={menuOpen}
        collapsed={sidebarCollapsed}
        onNavigate={() => setMenuOpen(false)}
        onToggle={toggleSidebar}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain pl-[var(--scrollbar-size)]">
        <main className="flex-1">
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>
      </div>
      {user.role === "ADMIN" && <AiChatWidget />}
    </div>
    </HeadingMetaContext.Provider>
  );
}

function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_KEY) === "1";
  } catch {
    return false;
  }
}
