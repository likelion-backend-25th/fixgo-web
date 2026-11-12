import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/cn";
const variantClass = {
    primary: "bg-blue-600 text-white shadow-sm hover:bg-blue-700",
    outline: "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50",
    ghost: "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
};
export function Button({ variant = "primary", className, type = "button", ...props }) {
    return (_jsx("button", { type: type, className: cn("inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50", variantClass[variant], className), ...props }));
}
