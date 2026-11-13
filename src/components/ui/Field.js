import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/cn";
const controlClass = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15";
export function TextField({ label, value, onChange, placeholder, type = "text", invalid = false, readOnly = false, required = false, className, }) {
    // 주소 필터가 다시 그려져도 조합 중인 한글이 끊기지 않게 입력값은 로컬에 둔다.
    const [text, setText] = useState(value);
    const composing = useRef(false);
    useEffect(() => {
        if (!composing.current) {
            setText(value);
        }
    }, [value]);
    function publish(next) {
        setText(next);
        onChange(next);
    }
    return (_jsxs("label", { className: cn("block text-sm", className), children: [label !== undefined && _jsxs("span", { className: "form-label mb-1.5 block", children: [label, required && _jsx("span", { className: "ml-0.5 text-red-500", children: "*" })] }), _jsx("input", { type: type, value: text, readOnly: readOnly, placeholder: placeholder, onCompositionStart: () => {
                composing.current = true;
            }, onCompositionEnd: (event) => {
                composing.current = false;
                publish(event.currentTarget.value);
            }, onChange: (event) => {
                const next = event.target.value;
                setText(next);
                if (!composing.current && !event.nativeEvent.isComposing) {
                    onChange(next);
                }
            }, className: cn(controlClass, invalid && "border-red-300 bg-red-50", readOnly && "bg-neutral-50 text-neutral-700") })] }));
}
export function TextArea({ label, value, onChange, placeholder, rows = 4, readOnly = false, required = false, className, }) {
    return (_jsxs("label", { className: cn("block text-sm", className), children: [label !== undefined && _jsxs("span", { className: "form-label mb-1.5 block", children: [label, required && _jsx("span", { className: "ml-0.5 text-red-500", children: "*" })] }), _jsx("textarea", { value: value, readOnly: readOnly, rows: rows, placeholder: placeholder, onChange: (event) => onChange(event.target.value), className: cn(controlClass, "resize-y", readOnly && "bg-neutral-50 text-neutral-700") })] }));
}
export function SelectBox({ value, onChange, options, className, ...props }) {
    return (_jsx("select", { value: value, onChange: (event) => onChange(event.target.value), className: cn(controlClass, "h-9 w-auto", className), ...props, children: options.map((option) => (_jsx("option", { value: option.value, children: option.label }, option.value))) }));
}
export function DateField({ label, value, onChange, readOnly = false, required = false, className }) {
    const pickerRef = useRef(null);
    const iso = toIsoDate(value);
    return (_jsxs("label", { className: cn("block text-sm", className), children: [label !== undefined && _jsxs("span", { className: "form-label mb-1.5 block", children: [label, required && _jsx("span", { className: "ml-0.5 text-red-500", children: "*" })] }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: "text", inputMode: "numeric", placeholder: "YYYY/MM/DD", value: formatDateInput(value), readOnly: readOnly, onChange: (event) => {
                            if (!readOnly) {
                                onChange(commitDateInput(event.target.value));
                            }
                        }, className: cn(controlClass, "pr-10", readOnly && "bg-neutral-50 text-neutral-700") }), _jsx("button", { type: "button", "aria-label": "\uB2EC\uB825\uC5D0\uC11C \uB0A0\uC9DC \uC120\uD0DD", disabled: readOnly, className: cn("absolute top-1/2 right-2 -translate-y-1/2 text-neutral-500", readOnly && "cursor-not-allowed text-neutral-300"), onClick: () => {
                            if (!readOnly) {
                                openDatePicker(pickerRef.current);
                            }
                        }, children: _jsx(Calendar, { className: "size-4" }) }), _jsx("input", { ref: pickerRef, type: "date", tabIndex: -1, "aria-hidden": true, disabled: readOnly, value: iso, onChange: (event) => {
                            if (!readOnly) {
                                onChange(event.target.value);
                            }
                        }, className: "pointer-events-none absolute size-0 opacity-0" })] })] }));
}
function formatDateInput(value) {
    return joinYearMonthDay(value.replace(/\D/g, "").slice(0, 8));
}
function commitDateInput(raw) {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    if (digits.length === 8) {
        return toIsoDate(digits);
    }
    return joinYearMonthDay(digits);
}
function toIsoDate(value) {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 8) {
        return "";
    }
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}
function joinYearMonthDay(digits) {
    const year = digits.slice(0, 4);
    const month = digits.slice(4, 6);
    const day = digits.slice(6, 8);
    return [year, month, day].filter((part) => part.length > 0).join("/");
}
function openDatePicker(input) {
    if (input === null) {
        return;
    }
    try {
        input.showPicker();
    }
    catch {
        input.click();
    }
}
export function FieldLabel({ children }) {
    return _jsx("span", { className: "form-label mb-1.5 block", children: children });
}
