import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { splitMarkdownTables } from "@/lib/markdownTable";
import { cn } from "@/lib/cn";
export function ChatMessageBody({ role, text }) {
    if (role === "user") {
        return _jsx("p", { className: cn(bubbleClass, "ml-auto bg-blue-600 text-white"), children: text });
    }
    if (text === "") {
        return _jsx("p", { className: cn(bubbleClass, "bg-neutral-100 text-neutral-900"), children: "\uB2F5\uBCC0\uC744 \uC791\uC131\uD558\uACE0 \uC788\uC2B5\uB2C8\uB2E4." });
    }
    return (_jsx("div", { className: "w-full space-y-2", children: splitMarkdownTables(text).map((block, index) => (block.type === "text" ? (_jsx("p", { className: cn(bubbleClass, "bg-neutral-100 text-neutral-900"), children: block.text }, index)) : (_jsx(MarkdownTableView, { table: block.table }, index)))) }));
}
const bubbleClass = "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap";
function MarkdownTableView({ table }) {
    return (_jsx("div", { className: "overflow-x-auto rounded-xl border border-neutral-200 bg-white", children: _jsxs("table", { className: "w-full border-collapse text-left text-xs", children: [_jsx("thead", { className: "bg-neutral-100", children: _jsx("tr", { children: table.headers.map((header, index) => (_jsx("th", { className: "border-b border-neutral-200 px-2 py-1.5 font-medium whitespace-nowrap text-neutral-700", children: header }, index))) }) }), _jsx("tbody", { children: table.rows.map((row, rowIndex) => (_jsx("tr", { children: row.map((cell, cellIndex) => (_jsx("td", { className: "border-b border-neutral-200 px-2 py-1.5 text-neutral-900", children: cell }, cellIndex))) }, rowIndex))) })] }) }));
}
