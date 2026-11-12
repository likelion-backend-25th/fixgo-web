import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const VISIBLE_PAGES = 5;
export function Pagination({ page, pageCount, onPageChange }) {
    const safeCount = Math.max(1, pageCount);
    const pages = visiblePages(page, safeCount);
    function go(next) {
        if (next < 1 || next > safeCount || next === page) {
            return;
        }
        onPageChange(next);
    }
    return (_jsxs("nav", { className: "mt-6 flex items-center justify-center gap-1 text-sm", "aria-label": "\uD398\uC774\uC9C0", children: [_jsx(PageButton, { label: "\u00AB", disabled: page === 1, onClick: () => go(1) }), _jsx(PageButton, { label: "<", disabled: page === 1, onClick: () => go(page - 1) }), pages.map((item) => (_jsx("button", { type: "button", onClick: () => go(item), className: item === page
                    ? "grid size-8 place-items-center rounded-lg bg-blue-600 font-medium text-white"
                    : "grid size-8 place-items-center rounded-lg text-neutral-600 hover:bg-white", "aria-current": item === page ? "page" : undefined, children: item }, item))), _jsx(PageButton, { label: ">", disabled: page === safeCount, onClick: () => go(page + 1) }), _jsx(PageButton, { label: "\u00BB", disabled: page === safeCount, onClick: () => go(safeCount) })] }));
}
function visiblePages(page, pageCount) {
    const length = Math.min(VISIBLE_PAGES, pageCount);
    const start = Math.min(Math.max(1, page - Math.floor(length / 2)), pageCount - length + 1);
    return Array.from({ length }, (_, index) => start + index);
}
function PageButton({ label, disabled, onClick, }) {
    return (_jsx("button", { type: "button", disabled: disabled, onClick: onClick, className: "grid size-8 place-items-center rounded-lg text-neutral-500 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent", children: label }));
}
