import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/Field";
import { isAbortError } from "@/lib/apiClient";
import { searchCustomers } from "@/lib/asReceptionApi";
export function CustomerNameField({ value, invalid = false, required = false, placeholder = "이름 일부를 입력하면 등록 고객이 나옵니다", onChange, onPick }) {
    const [open, setOpen] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    useEffect(() => {
        const keyword = value.trim();
        if (!open || keyword === "") {
            setSuggestions([]);
            return;
        }
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            // 이름 일부만 넘겨도 서버가 포함된 고객을 돌려준다.
            searchCustomers(keyword, controller.signal)
                .then((items) => {
                if (!controller.signal.aborted) {
                    setSuggestions(items.slice(0, 8));
                }
            })
                .catch((cause) => {
                if (controller.signal.aborted || isAbortError(cause)) {
                    return;
                }
                setSuggestions([]);
            });
        }, 250);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [open, value]);
    function pick(customer) {
        setOpen(false);
        setSuggestions([]);
        onPick(customer);
    }
    return (_jsxs("div", { className: "relative", onBlur: (event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
                setOpen(false);
            }
        }, children: [_jsx(TextField, { label: "\uACE0\uAC1D\uBA85", value: value, invalid: invalid, required: required, placeholder: placeholder, onChange: (name) => {
                    setOpen(true);
                    onChange(name);
                } }), open && suggestions.length > 0 && (_jsx("ul", { className: "absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-300 bg-white py-1 shadow-sm", children: suggestions.map((customer) => (_jsx("li", { children: _jsxs("button", { type: "button", className: "flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-50", onMouseDown: (event) => event.preventDefault(), onClick: () => pick(customer), children: [_jsx("span", { children: customer.name }), _jsx("span", { className: "text-neutral-500", children: customer.phone })] }) }, customer.id))) }))] }));
}
