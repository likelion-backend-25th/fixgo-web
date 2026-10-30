import { Link } from "react-router";
import { cn } from "@/lib/cn";

export function ProgressTabs({ repairId, current }: { repairId: string; current: "inspection" | "repair" }) {
  const tabs = [
    { id: "inspection" as const, label: "점검/견적", to: `/as/${repairId}/inspection` },
    { id: "repair" as const, label: "수리", to: `/as/${repairId}/repair` },
  ];
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          to={tab.to}
          className={cn(
            "rounded border px-4 py-1.5 text-sm",
            current === tab.id
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-neutral-300 bg-white text-neutral-700",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
