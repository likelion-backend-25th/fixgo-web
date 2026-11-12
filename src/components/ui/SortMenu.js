import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/cn";
export function SortMenu({ label, active, direction, onToggle }) {
    const ascending = active && direction === "asc";
    const Icon = ascending ? ChevronUp : ChevronDown;
    return (_jsxs("button", { type: "button", className: "inline-flex items-center gap-1", onClick: onToggle, children: [label, _jsx(Icon, { className: cn("size-3", active ? "text-blue-600" : "text-neutral-400"), "aria-hidden": true })] }));
}
