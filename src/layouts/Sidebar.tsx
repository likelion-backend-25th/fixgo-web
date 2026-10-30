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
        "w-56 shrink-0 flex-col border-r border-neutral-200 bg-neutral-100",
        open ? "fixed inset-y-0 z-40 flex" : "hidden md:flex",
      )}
    >
      <Link to="/as/list" onClick={onNavigate} className="flex items-center gap-2 px-4 py-4">
        <span className="grid size-8 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
          F
        </span>
        <span className="text-lg font-semibold text-blue-600">FixGo</span>
      </Link>
      <nav className="flex-1 overflow-y-auto pb-4">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => role !== undefined && item.roles.includes(role));
          if (items.length === 0) {
            return null;
          }
          return (
            <div key={group.label}>
              <p className="px-4 pt-4 pb-1 text-xs text-neutral-500">{group.label}</p>
              {items.map((item) => {
                const active = isNavActive(pathname, item.to);
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    onClick={onNavigate}
                    className={cn(
                      "mx-3 my-0.5 block rounded border px-3 py-1.5 text-sm",
                      active
                        ? "border-blue-500 bg-white font-medium text-blue-600"
                        : "border-transparent text-neutral-700 hover:bg-white",
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
        className="m-3 rounded border border-neutral-300 bg-white px-3 py-2 text-left text-sm text-neutral-600 hover:bg-neutral-50"
      >
        로그아웃
      </button>
    </aside>
  );
}
