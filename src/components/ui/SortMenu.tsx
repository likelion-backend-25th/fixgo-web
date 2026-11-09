import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";

interface SortMenuProps {
  label: string;
  active: boolean;
  direction: "asc" | "desc";
  onToggle: () => void;
}

export function SortMenu({ label, active, direction, onToggle }: SortMenuProps) {
  const ascending = active && direction === "asc";
  const Icon = ascending ? ChevronUp : ChevronDown;
  return (
    <button type="button" className="inline-flex items-center gap-1" onClick={onToggle}>
      {label}
      <Icon className={cn("size-3", active ? "text-blue-600" : "text-neutral-400")} aria-hidden />
    </button>
  );
}
