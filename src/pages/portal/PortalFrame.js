import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function PortalFrame({ children }) {
    return (_jsx("div", { className: "min-h-screen bg-neutral-100 px-4 py-10", children: _jsxs("div", { className: "mx-auto w-full max-w-sm rounded-2xl border border-neutral-200 bg-white px-5 py-6 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white", children: "F" }), _jsx("p", { className: "text-xl font-bold tracking-tight text-neutral-900", children: "FixGo" })] }), _jsx("div", { className: "mt-5", children: children })] }) }));
}
export function InfoRow({ label, value, emphasize = false }) {
    return (_jsxs("div", { className: "flex items-baseline justify-between gap-4 border-b border-neutral-100 py-3 text-sm last:border-b-0", children: [_jsx("dt", { className: "shrink-0 text-neutral-500", children: label }), _jsx("dd", { className: emphasize ? "text-right text-base font-semibold text-neutral-900" : "text-right font-medium break-all text-neutral-900", children: value })] }));
}
