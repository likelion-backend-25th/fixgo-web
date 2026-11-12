import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { TextField } from "@/components/ui/Field";
import { isAbortError } from "@/lib/apiClient";
import { searchProductsBySerial } from "@/lib/asReceptionApi";
export function SerialNumberField({ value, invalid = false, placeholder = "시리얼번호 조회 가능합니다", onChange, onPick }) {
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
            searchProductsBySerial(keyword, controller.signal)
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
    function pick(product) {
        setOpen(false);
        setSuggestions([]);
        onPick(product);
    }
    return (_jsxs("div", { className: "relative", onBlur: (event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
                setOpen(false);
            }
        }, children: [_jsx(TextField, { label: "\uC2DC\uB9AC\uC5BC\uBC88\uD638", value: value, invalid: invalid, placeholder: placeholder, onChange: (serial) => {
                    setOpen(true);
                    onChange(serial);
                } }), open && suggestions.length > 0 && (_jsx("ul", { className: "absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-300 bg-white py-1 shadow-sm", children: suggestions.map((product) => (_jsx("li", { children: _jsxs("button", { type: "button", className: "flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-neutral-50", onMouseDown: (event) => event.preventDefault(), onClick: () => pick(product), children: [_jsx("span", { children: product.serialNumber }), _jsx("span", { className: "text-neutral-500", children: product.modelName })] }) }, product.id))) }))] }));
}
