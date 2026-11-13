import { Bot, X } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
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

interface Point {
  x: number;
  y: number;
}

const BUTTON_SIZE = 48;
const VIEW_MARGIN = 20;
const DRAG_THRESHOLD = 4;
const POSITION_KEY = "fixgo-chat-button";

interface DragState {
  pointerId: number;
  originX: number;
  originY: number;
  startX: number;
  startY: number;
  moved: boolean;
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [position, setPosition] = useState<Point>(() => readChatPosition());
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const dragRef = useRef<DragState | null>(null);

  function changeDraft(value: string) {
    draftRef.current = value;
    setDraft(value);
  }
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    function onResize() {
      setPosition((current) => clampChatPosition(current));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  // 조금 움직이면 위치 이동이고, 거의 제자리면 열기/닫기다.
  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return;
    }
    dragRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      startX: position.x,
      startY: position.y,
      moved: false,
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  }

  function onPointerMove(event: Event) {
    if (!(event instanceof globalThis.PointerEvent)) {
      return;
    }
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - drag.originX;
    const dy = event.clientY - drag.originY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
      return;
    }
    drag.moved = true;
    setPosition(clampChatPosition({ x: drag.startX + dx, y: drag.startY + dy }));
  }

  function onPointerUp(event: Event) {
    if (!(event instanceof globalThis.PointerEvent)) {
      return;
    }
    const drag = dragRef.current;
    if (drag === null || drag.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    if (drag.moved) {
      const next = clampChatPosition({
        x: drag.startX + (event.clientX - drag.originX),
        y: drag.startY + (event.clientY - drag.originY),
      });
      setPosition(next);
      saveChatPosition(next);
      return;
    }
    setOpen((value) => !value);
  }

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="AI 챗봇"
          className="fixed z-40 flex flex-col rounded-2xl border border-neutral-200 bg-white shadow-xl"
          style={chatPanelStyle(position)}
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
        title="끌어서 이동"
        className="fixed z-40 grid size-12 cursor-grab touch-none place-items-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:cursor-grabbing"
        style={{ left: position.x, top: position.y }}
        onPointerDown={onPointerDown}
      >
        {open ? <X className="size-5" /> : <Bot className="size-5" />}
      </button>
    </>
  );
}

function readChatPosition(): Point {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (raw === null) {
      return defaultChatPosition();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isPoint(parsed)) {
      return defaultChatPosition();
    }
    return clampChatPosition(parsed);
  } catch {
    return defaultChatPosition();
  }
}

function saveChatPosition(point: Point) {
  localStorage.setItem(POSITION_KEY, JSON.stringify(point));
}

function defaultChatPosition(): Point {
  return clampChatPosition({
    x: window.innerWidth - BUTTON_SIZE - VIEW_MARGIN,
    y: window.innerHeight - BUTTON_SIZE - VIEW_MARGIN,
  });
}

function clampChatPosition(point: Point): Point {
  const maxX = Math.max(VIEW_MARGIN, window.innerWidth - BUTTON_SIZE - VIEW_MARGIN);
  const maxY = Math.max(VIEW_MARGIN, window.innerHeight - BUTTON_SIZE - VIEW_MARGIN);
  return {
    x: Math.min(Math.max(VIEW_MARGIN, point.x), maxX),
    y: Math.min(Math.max(VIEW_MARGIN, point.y), maxY),
  };
}

function chatPanelStyle(button: Point): { left: number; top: number; width: number; height: number } {
  const width = Math.min(384, window.innerWidth - VIEW_MARGIN * 2);
  const gap = 12;
  const preferredHeight = Math.min(512, window.innerHeight * 0.7);
  const spaceAbove = button.y - VIEW_MARGIN - gap;
  const spaceBelow = window.innerHeight - (button.y + BUTTON_SIZE) - VIEW_MARGIN - gap;
  const placeAbove = spaceAbove >= spaceBelow;
  const height = Math.min(preferredHeight, Math.max(160, placeAbove ? spaceAbove : spaceBelow));
  const top = placeAbove ? button.y - gap - height : button.y + BUTTON_SIZE + gap;
  const maxLeft = Math.max(VIEW_MARGIN, window.innerWidth - width - VIEW_MARGIN);
  const left = Math.min(Math.max(VIEW_MARGIN, button.x + BUTTON_SIZE - width), maxLeft);
  return { left, top, width, height };
}

function isPoint(value: unknown): value is Point {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const point = value as { x?: unknown; y?: unknown };
  return typeof point.x === "number" && Number.isFinite(point.x) && typeof point.y === "number" && Number.isFinite(point.y);
}
