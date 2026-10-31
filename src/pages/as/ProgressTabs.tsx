import { Link } from "react-router";
import { cn } from "@/lib/cn";

export function ProgressTabs({ repairId, current }: { repairId: string; current: "inspection" | "repair" }) {
  const tabs = [
    { id: "inspection" as const, label: "점검/견적", to: `/as/${repairId}/inspection` },
    { id: "repair" as const, label: "수리", to: `/as/${repairId}/repair` },
  ];
  return (
    <div className="inline-flex rounded-lg bg-neutral-100 p-1">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          to={tab.to}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm",
            current === tab.id
              ? "bg-white font-medium text-blue-600 shadow-sm"
              : "text-neutral-600 hover:text-neutral-900",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
