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
    <div className="flex min-h-screen bg-white text-neutral-900">
      {menuOpen && (
        <button
          type="button"
          aria-label="메뉴 닫기"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <Sidebar open={menuOpen} onNavigate={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col border-t-4 border-blue-600">
        <header className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="rounded border border-neutral-300 p-1.5 md:hidden"
              aria-label="메뉴 열기"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="size-4" />
            </button>
            <h1 className="truncate text-lg font-semibold">{heading.title}</h1>
            {heading.meta !== undefined && (
              <span className="hidden text-sm text-neutral-500 sm:inline">{heading.meta}</span>
            )}
          </div>
          <Link to="/member/me" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-full bg-blue-600 text-sm font-semibold text-white">
              {user.name.slice(0, 1)}
            </span>
            <span className="text-right text-sm leading-tight">
              <span className="block font-medium">{user.name}</span>
              <span className="block text-xs text-neutral-500">{ROLE_LABEL[user.role]}</span>
            </span>
          </Link>
        </header>
        <main className="flex-1 px-4 py-5 md:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
