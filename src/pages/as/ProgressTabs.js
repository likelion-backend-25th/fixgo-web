import { jsx as _jsx } from "react/jsx-runtime";
import { Link } from "react-router";
import { cn } from "@/lib/cn";
export function ProgressTabs({ receptionId, current }) {
    const tabs = [
        { id: "inspection", label: "점검/견적", to: `/as/${receptionId}/inspection` },
        { id: "repair", label: "수리", to: `/as/${receptionId}/repair` },
    ];
    return (_jsx("div", { className: "inline-flex rounded-lg bg-neutral-100 p-1", children: tabs.map((tab) => (_jsx(Link, { to: tab.to, className: cn("rounded-md px-4 py-1.5 text-sm", current === tab.id
                ? "bg-white font-medium text-blue-600 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900"), children: tab.label }, tab.id))) }));
}
