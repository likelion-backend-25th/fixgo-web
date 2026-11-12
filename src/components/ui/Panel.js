import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/cn";
export function Panel({ title, action, children, className }) {
    return (_jsxs("section", { className: cn("rounded-xl border border-neutral-200 bg-white p-5 shadow-sm", className), children: [(title !== undefined || action !== undefined) && (_jsxs("div", { className: "mb-4 flex items-center justify-between gap-3", children: [title !== undefined ? _jsx("h2", { className: "section-title", children: title }) : _jsx("span", {}), action] })), children] }));
}
export function InfoField({ label, value }) {
    return (_jsxs("div", { children: [_jsx("div", { className: "text-xs text-neutral-500", children: label }), _jsx("div", { className: "mt-1 text-sm font-medium text-neutral-900", children: value })] }));
}
export function FormActions({ hint, children }) {
    return (_jsxs("div", { children: [_jsx("div", { className: "h-16", "aria-hidden": "true" }), _jsx("div", { className: "fixed right-0 bottom-0 left-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur md:left-56", children: _jsxs("div", { className: "mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-8 py-3", children: [_jsx("p", { className: "text-[13px] text-neutral-500", children: hint ?? "" }), _jsx("div", { className: "ml-auto flex gap-2", children: children })] }) })] }));
}
export function Notice({ tone = "info", children }) {
    return (_jsx("p", { className: cn("mb-4 rounded-lg border px-3.5 py-2.5 text-sm", tone === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-blue-200 bg-blue-50 text-blue-800"), children: children }));
}
