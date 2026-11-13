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
const MIN_WIDTH = 280;
const MIN_HEIGHT = 220;
const POSITION_KEY = "fixgo-chat-button";
const SIZE_KEY = "fixgo-chat-size";

interface ChatSize {
  width: number;
  height: number;
}

interface DragState {
  pointerId: number;
  originX: number;
  originY: number;
  startX: number;
  startY: number;
  moved: boolean;
}

interface ResizeState {
  pointerId: number;
  originX: number;
  originY: number;
  startWidth: number;
  startHeight: number;
  placeAbove: boolean;
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [position, setPosition] = useState<Point>(() => readChatPosition());
  const [size, setSize] = useState<ChatSize>(() => readChatSize());
  const nextId = useRef(1);
  const listRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef("");
  const abortRef = useRef<AbortController | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);

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

  function onResizePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) {
      return;
    }
    event.stopPropagation();
    const box = chatPanelStyle(position, size);
    resizeRef.current = {
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      startWidth: box.width,
      startHeight: box.height,
      placeAbove: box.placeAbove,
    };
    window.addEventListener("pointermove", onResizePointerMove);
    window.addEventListener("pointerup", onResizePointerUp);
    window.addEventListener("pointercancel", onResizePointerUp);
  }

  function onResizePointerMove(event: Event) {
    if (!(event instanceof globalThis.PointerEvent)) {
      return;
    }
    const resize = resizeRef.current;
    if (resize === null || resize.pointerId !== event.pointerId) {
      return;
    }
    // 오른쪽은 버튼에 고정이라, 왼쪽·바깥쪽으로 끌수록 커진다.
    const next = clampChatSize({
      width: resize.startWidth - (event.clientX - resize.originX),
      height: resize.placeAbove
        ? resize.startHeight - (event.clientY - resize.originY)
        : resize.startHeight + (event.clientY - resize.originY),
    }, position);
    setSize(next);
  }

  function onResizePointerUp(event: Event) {
    if (!(event instanceof globalThis.PointerEvent)) {
      return;
    }
    const resize = resizeRef.current;
    if (resize === null || resize.pointerId !== event.pointerId) {
      return;
    }
    resizeRef.current = null;
    window.removeEventListener("pointermove", onResizePointerMove);
    window.removeEventListener("pointerup", onResizePointerUp);
    window.removeEventListener("pointercancel", onResizePointerUp);
    const next = clampChatSize({
      width: resize.startWidth - (event.clientX - resize.originX),
      height: resize.placeAbove
        ? resize.startHeight - (event.clientY - resize.originY)
        : resize.startHeight + (event.clientY - resize.originY),
    }, position);
    setSize(next);
    saveChatSize(next);
  }

  const panel = chatPanelStyle(position, size);

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="AI 챗봇"
          className="fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
          style={{ left: panel.left, top: panel.top, width: panel.width, height: panel.height }}
        >
          <button
            type="button"
            aria-label="챗봇 크기 조절"
            title="끌어서 크기 조절"
            className={`absolute z-10 size-6 touch-none text-neutral-400 hover:text-neutral-600 ${panel.placeAbove ? "top-1.5 left-1.5 cursor-nwse-resize" : "bottom-1.5 left-1.5 cursor-nesw-resize"}`}
            onPointerDown={onResizePointerDown}
          >
            <ResizeGrip above={panel.placeAbove} />
          </button>
          <div className={`flex items-center justify-between border-b border-neutral-200 py-3 pr-4 ${panel.placeAbove ? "pl-8" : "pl-4"}`}>
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
            className={`flex items-center gap-2 border-t border-neutral-200 py-3 pr-3 ${panel.placeAbove ? "pl-3" : "pl-8"}`}
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

function readChatSize(): ChatSize {
  try {
    const raw = localStorage.getItem(SIZE_KEY);
    if (raw === null) {
      return defaultChatSize();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isChatSize(parsed)) {
      return defaultChatSize();
    }
    return parsed;
  } catch {
    return defaultChatSize();
  }
}

function saveChatSize(size: ChatSize) {
  localStorage.setItem(SIZE_KEY, JSON.stringify(size));
}

function defaultChatSize(): ChatSize {
  return {
    width: Math.min(384, Math.max(MIN_WIDTH, window.innerWidth - VIEW_MARGIN * 2)),
    height: Math.min(512, Math.max(MIN_HEIGHT, window.innerHeight * 0.7)),
  };
}

function clampChatSize(size: ChatSize, button: Point): ChatSize {
  const limits = panelLimits(button);
  return {
    width: fitSize(size.width, MIN_WIDTH, limits.maxWidth),
    height: fitSize(size.height, MIN_HEIGHT, limits.maxHeight),
  };
}

function fitSize(value: number, min: number, max: number): number {
  const lower = Math.min(min, max);
  return Math.min(Math.max(lower, value), max);
}

function panelLimits(button: Point): { maxWidth: number; maxHeight: number; placeAbove: boolean } {
  const gap = 12;
  const spaceAbove = button.y - VIEW_MARGIN - gap;
  const spaceBelow = window.innerHeight - (button.y + BUTTON_SIZE) - VIEW_MARGIN - gap;
  const placeAbove = spaceAbove >= spaceBelow;
  return {
    maxWidth: Math.max(160, window.innerWidth - VIEW_MARGIN * 2),
    maxHeight: Math.max(160, placeAbove ? spaceAbove : spaceBelow),
    placeAbove,
  };
}

function chatPanelStyle(button: Point, size: ChatSize): { left: number; top: number; width: number; height: number; placeAbove: boolean } {
  const gap = 12;
  const limits = panelLimits(button);
  const fitted = clampChatSize(size, button);
  const top = limits.placeAbove ? button.y - gap - fitted.height : button.y + BUTTON_SIZE + gap;
  const maxLeft = Math.max(VIEW_MARGIN, window.innerWidth - fitted.width - VIEW_MARGIN);
  const left = Math.min(Math.max(VIEW_MARGIN, button.x + BUTTON_SIZE - fitted.width), maxLeft);
  return { left, top, width: fitted.width, height: fitted.height, placeAbove: limits.placeAbove };
}

function ResizeGrip({ above }: { above: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      aria-hidden="true"
      className={above ? "scale-y-[-1]" : undefined}
    >
      <path d="M2 12 L12 2 M2 8 L8 2 M6 12 L12 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function isChatSize(value: unknown): value is ChatSize {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const size = value as { width?: unknown; height?: unknown };
  return typeof size.width === "number" && Number.isFinite(size.width) && typeof size.height === "number" && Number.isFinite(size.height);
}

function isPoint(value: unknown): value is Point {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const point = value as { x?: unknown; y?: unknown };
  return typeof point.x === "number" && Number.isFinite(point.x) && typeof point.y === "number" && Number.isFinite(point.y);
}
