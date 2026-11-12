import { apiFetch, readErrorMessage } from "@/lib/apiClient";
export async function streamAdminChat(text, onChunk, signal) {
    const response = await apiFetch("/api/v1/ai/chat/stream", {
        method: "POST",
        signal,
        headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
        },
        body: JSON.stringify({ text }),
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response, "답변을 받지 못했습니다."));
    }
    if (response.body === null) {
        throw new Error("답변을 받지 못했습니다.");
    }
    const contentType = response.headers.get("Content-Type") ?? "";
    if (contentType.includes("application/json")) {
        onChunk(readJsonChatAnswer(await response.text()));
        return;
    }
    // Spring이 text/event-stream으로 토큰을 나눠 보낸다. 그 외에는 받은 조각을 그대로 붙인다.
    const sse = contentType.includes("text/event-stream");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    signal.addEventListener("abort", () => {
        void reader.cancel();
    }, { once: true });
    let buffer = "";
    while (true) {
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        buffer += decoder.decode(value, { stream: true });
        if (sse) {
            buffer = drainSse(buffer, onChunk);
        }
        else {
            onChunk(buffer);
            buffer = "";
        }
    }
    buffer += decoder.decode();
    if (sse && buffer.length > 0) {
        drainSse(`${buffer}\n\n`, onChunk);
    }
    else if (!sse && buffer !== "") {
        onChunk(buffer);
    }
}
function drainSse(buffer, onChunk) {
    const parts = buffer.split("\n\n");
    const rest = parts.pop() ?? "";
    for (const part of parts) {
        // data: 뒤의 공백은 토큰의 띄어쓰기일 수 있어 지우지 않는다.
        const data = part
            .split("\n")
            .filter((line) => line.startsWith("data:"))
            .map((line) => line.slice("data:".length))
            .join("\n");
        if (data.length > 0) {
            onChunk(data);
        }
    }
    return rest;
}
function readJsonChatAnswer(text) {
    try {
        const body = JSON.parse(text);
        if (typeof body === "string") {
            return body;
        }
        if (Array.isArray(body)) {
            return body.filter((item) => typeof item === "string").join("");
        }
    }
    catch {
        // 본문이 JSON이 아니면 받은 문자열을 그대로 보여 준다.
    }
    return text;
}
