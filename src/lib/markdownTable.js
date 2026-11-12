const SEPARATOR_CELL = /^:?-{3,}:?$/;
export function splitMarkdownTables(source) {
    const lines = source.split("\n");
    const blocks = [];
    const text = [];
    function flushText() {
        const joined = text.join("\n").replace(/^\n+|\n+$/g, "");
        text.length = 0;
        if (joined !== "") {
            blocks.push({ type: "text", text: joined });
        }
    }
    for (let index = 0; index < lines.length; index += 1) {
        const separator = lines[index + 1];
        if (!isTableStart(lines[index], separator)) {
            text.push(lines[index]);
            continue;
        }
        flushText();
        const headers = splitRow(lines[index]);
        const rows = [];
        index += 2;
        while (index < lines.length && isTableRow(lines[index])) {
            rows.push(padRow(splitRow(lines[index]), headers.length));
            index += 1;
        }
        index -= 1;
        blocks.push({ type: "table", table: { headers, rows } });
    }
    flushText();
    return blocks;
}
function isTableStart(header, separator) {
    if (header === undefined || separator === undefined) {
        return false;
    }
    if (!header.includes("|") || !separator.includes("|")) {
        return false;
    }
    const headers = splitRow(header);
    const separators = splitRow(separator);
    return headers.length >= 2
        && separators.length === headers.length
        && separators.every((cell) => SEPARATOR_CELL.test(cell));
}
function isTableRow(line) {
    if (!line.includes("|") || isSeparatorLine(line)) {
        return false;
    }
    return splitRow(line).length >= 2;
}
function isSeparatorLine(line) {
    const cells = splitRow(line);
    return cells.length >= 2 && cells.every((cell) => SEPARATOR_CELL.test(cell));
}
function splitRow(line) {
    let text = line.trim();
    if (text.startsWith("|")) {
        text = text.slice(1);
    }
    if (text.endsWith("|")) {
        text = text.slice(0, -1);
    }
    return text.split("|").map((cell) => cell.trim());
}
function padRow(cells, width) {
    return Array.from({ length: width }, (_, index) => cells[index] ?? "");
}
