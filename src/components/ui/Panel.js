import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/cn";
export function Panel({ title, action, children, className }) {
    return (_jsxs("section", { className: cn("rounded-xl border border-neutral-200 bg-white p-5 shadow-sm", className), children: [(title !== undefined || action !== undefined) && (_jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [title !== undefined ? _jsx("h2", { className: "text-sm font-semibold text-neutral-900", children: title }) : _jsx("span", {}), action] })), children] }));
}
export function InfoField({ label, value }) {
    return (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-neutral-500", children: label }), _jsx("div", { className: "mt-1 text-sm font-medium text-neutral-900", children: value })] }));
}
export function Notice({ tone = "info", children }) {
    return (_jsx("p", { className: cn("mb-4 rounded-lg border px-3.5 py-2.5 text-sm", tone === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-blue-200 bg-blue-50 text-blue-800"), children: children }));
}
