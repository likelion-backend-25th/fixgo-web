import { Bot, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { streamAdminChat } from "@/lib/aiChatApi";
import { isAbortError } from "@/lib/apiClient";
import { ChatMessageBody } from "@/layouts/ChatMessageBody";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);

  function changeDraft(value: string) {
    draftRef.current = value;
    setDraft(value);
  }
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const list = listRef.current;
    if (list !== null) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function send() {
    const text = draftRef.current.trim();
    if (text === "") return;
    const userId = nextId.current;
    const assistantId = nextId.current + 1;
    nextId.current += 2;
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", text },
      { id: assistantId, role: "assistant", text: "" },
    ]);
    draftRef.current = "";
    setDraft("");
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamAdminChat(text, (chunk) => {
        setMessages((current) => current.map((message) => (
          message.id === assistantId ? { ...message, text: message.text + chunk } : message
        )));
      }, controller.signal);
    } catch (cause: unknown) {
      if (isAbortError(cause)) {
        setMessages((current) => current.filter((item) => item.id !== assistantId || item.text !== ""));
        return;
      }
      const message = cause instanceof Error ? cause.message : "답변을 받지 못했습니다.";
      setMessages((current) => current.map((item) => (
        item.id === assistantId && item.text === "" ? { ...item, text: message } : item
      )));
    }
  }

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="AI 챗봇"
          className="fixed right-5 bottom-20 z-40 flex h-[min(32rem,70vh)] w-[min(24rem,calc(100vw-2.5rem))] flex-col rounded-2xl border border-neutral-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-neutral-900">AI 챗봇</p>
              <p className="text-xs text-neutral-500">관리자 통계 도우미</p>
            </div>
            <button
              type="button"
              aria-label="AI 챗봇 닫기"
              className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </button>
          </div>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <p className="text-sm text-neutral-500">수리, 결제, 배송 통계를 물어보세요.</p>
            )}
            {messages.map((message) => (
              <ChatMessageBody key={message.id} role={message.role} text={message.text} />
            ))}
          </div>
          <form
            className="flex items-center gap-2 border-t border-neutral-200 p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void send();
            }}
          >
            <TextField
              value={draft}
              onChange={changeDraft}
              placeholder="통계를 물어보세요"
              className="min-w-0 flex-1"
            />
            <Button type="submit" disabled={draft.trim() === ""}>전송</Button>
          </form>
        </section>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "AI 챗봇 닫기" : "AI 챗봇 열기"}
        className="fixed right-5 bottom-5 z-40 grid size-12 place-items-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="size-5" /> : <Bot className="size-5" />}
      </button>
    </>
  );
}
