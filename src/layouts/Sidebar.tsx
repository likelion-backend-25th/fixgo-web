import { Link, useLocation } from "react-router";
import { cn } from "@/lib/cn";
import { useSessionStore } from "@/stores/useSessionStore";
import { isNavActive, NAV_GROUPS } from "@/layouts/navigation";

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
}

export function Sidebar({ open, onNavigate }: SidebarProps) {
  const { pathname } = useLocation();
  const user = useSessionStore((state) => state.user);
  const logout = useSessionStore((state) => state.logout);
  const role = user?.role;

  return (
    <aside
      className={cn(
        "w-56 shrink-0 flex-col border-r border-neutral-200 bg-white",
        open ? "fixed inset-y-0 z-40 flex" : "hidden md:flex",
      )}
    >
      <Link
        to="/as/list"
        onClick={onNavigate}
        className="flex items-center gap-2.5 border-b border-neutral-200 px-4 py-4"
      >
        <span className="grid size-8 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          F
        </span>
        <span className="text-base font-semibold tracking-tight text-neutral-900">FixGo</span>
      </Link>
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => role !== undefined && item.roles.includes(role));
          if (items.length === 0) {
            return null;
          }
          return (
            <div key={group.label} className="mb-2">
              <p className="px-2.5 pt-3 pb-1 text-[11px] font-medium tracking-wide text-neutral-400">
                {group.label}
              </p>
              {items.map((item) => {
                const active = isNavActive(pathname, item.to);
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "my-0.5 block rounded-lg px-2.5 py-2 text-sm",
                      active
                        ? "bg-blue-50 font-medium text-blue-600"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => {
          logout();
          onNavigate();
        }}
        className="mx-3 mb-3 rounded-lg px-2.5 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
      >
        로그아웃
      </button>
    </aside>
  );
}
