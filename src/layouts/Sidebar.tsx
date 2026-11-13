import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router";
import { logoutFromServer } from "@/lib/authApi";
import { cn } from "@/lib/cn";
import { useSessionStore } from "@/stores/useSessionStore";
import { isNavActive, NAV_GROUPS } from "@/layouts/navigation";

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onNavigate: () => void;
  onToggle: () => void;
}

export function Sidebar({ open, collapsed, onNavigate, onToggle }: SidebarProps) {
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

  return (
    <div
      className={cn(
        "relative shrink-0 transition-[width] duration-200",
        open
          ? "fixed top-14 bottom-0 z-40 w-56"
          : folded
            ? "hidden w-0 md:block"
            : "hidden w-56 md:block",
      )}
    >
    <aside
      inert={folded}
      className={cn(
        "absolute inset-0 flex flex-col overflow-hidden bg-white",
        folded ? "border-0" : "border-r border-neutral-200",
      )}
    >
      <nav className="flex-1 overflow-y-auto overscroll-y-contain py-4">
        {groups.map((group, index) => (
          <div
            key={group.label}
            className={cn(
              "px-2",
              index > 0 && "mt-3 border-t border-neutral-200 pt-3",
            )}
          >
            <p className="px-2 pb-2 text-sm font-semibold text-[#005A9C]">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = isNavActive(pathname, item.to);
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  onClick={onNavigate}
                  className={cn(
                    "my-0.5 block rounded-md py-2 pr-2 pl-6 text-sm",
                    active
                      ? "bg-[#E7F4FB] font-semibold text-[#005A9C]"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <button
        type="button"
        onClick={() => {
          void logoutFromServer();
          onNavigate();
        }}
        className="mx-3 mb-3 rounded-lg px-2.5 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"
      >
        로그아웃
      </button>
    </aside>
      <button
        type="button"
        className={cn(
          "fixed top-1/2 z-30 hidden h-20 w-5 -translate-y-1/2 items-center justify-center rounded-r-md border border-neutral-200 bg-white text-neutral-600 transition-[left] duration-200 hover:bg-neutral-50 md:inline-flex",
          folded ? "left-0" : "left-56",
        )}
        aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
      </button>
    </div>
  );
}
