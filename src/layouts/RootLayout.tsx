import { Menu } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router";
import { useHydratedSession } from "@/hooks/useHydratedSession";
import { Sidebar } from "@/layouts/Sidebar";
import { resolveHeading } from "@/layouts/navigation";
import { ROLE_LABEL } from "@/types/staff";

export function RootLayout() {
  const { user, ready } = useHydratedSession();
  const { pathname } = useLocation();
  const [menuState, setMenuState] = useState({ path: pathname, open: false });
  const menuOpen = menuState.open && menuState.path === pathname;

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

  return (
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
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded-lg p-2 text-neutral-700 hover:bg-neutral-100 md:hidden"
              aria-label="메뉴 열기"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-4" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold tracking-tight">{heading.title}</h1>
              {heading.meta !== undefined && (
                <p className="truncate text-xs text-neutral-500">{heading.meta}</p>
              )}
            </div>
          </div>
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
        </header>
        <main className="flex-1 px-4 py-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
