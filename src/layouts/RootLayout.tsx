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
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      {menuOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-30 bg-neutral-900/30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col pl-[var(--scrollbar-size)]">
        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-8 py-3">
          <div className="flex min-w-0 items-center gap-3">
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
              className="flex items-center gap-2.5 rounded-full py-1 pr-2 pl-1 hover:bg-neutral-50"
            >
              <span className="grid size-8 place-items-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                {user.name.slice(0, 1)}
              </span>
              <span className="text-right text-sm leading-tight">
                <span className="block font-medium">{user.name}</span>
                <span className="block text-xs text-neutral-500">{ROLE_LABEL[user.role]}</span>
              </span>
            </Link>
            <Button variant="outline" onClick={() => void logoutFromServer()}>로그아웃</Button>
          </div>
          </div>
        </header>
        <main className="flex-1">
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>
      {user.role === "ADMIN" && <AiChatWidget />}
    </div>
    </HeadingMetaContext.Provider>
  );
}
