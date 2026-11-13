import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

interface PanelProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Panel({ title, action, children, className }: PanelProps) {
  return (
    <section className={cn("rounded-xl border border-neutral-200 bg-white p-5 shadow-sm", className)}>
      {(title !== undefined || action !== undefined) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title !== undefined ? <h2 className="section-title">{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function InfoField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-neutral-900">{value}</div>
    </div>
  );
}

export function FormActions({ hint, children }: { hint?: string; children: ReactNode }) {
  return (
    <>
      <div className="h-16" aria-hidden="true" />
      <div className="fixed right-0 bottom-0 left-0 z-30 border-t border-neutral-200 bg-white/95 backdrop-blur md:left-56">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-8 py-3">
          <p className="text-[13px] text-neutral-500">{hint ?? ""}</p>
          <div className="ml-auto flex gap-2">{children}</div>
        </div>
      </div>
    </>
  );
}

interface NoticeProps {
  tone?: "info" | "error";
  /** 본문에 고정할 설명문은 false. 막히거나 실패한 안내는 스크롤을 따라간다. */
  follow?: boolean;
  children: string;
}

const noticeToneClass = {
  error: "border-red-200 bg-red-50 text-red-700",
  info: "border-blue-200 bg-blue-50 text-blue-800",
} as const;

interface NoticePin {
  anchor: HTMLElement;
  banner: HTMLElement;
  scrollParent: HTMLElement;
  dialog: HTMLElement | null;
  page: HTMLElement | null;
}

const noticePins = new Set<NoticePin>();

function scrollParentOf(node: HTMLElement): HTMLElement | null {
  let current = node.parentElement;
  while (current !== null && current !== document.body) {
    const overflow = getComputedStyle(current).overflowY;
    if (overflow === "auto" || overflow === "scroll") return current;
    current = current.parentElement;
  }
  return null;
}

function stickLine(scrollParent: HTMLElement, dialog: HTMLElement | null): number {
  const parentTop = scrollParent.getBoundingClientRect().top + 12;
  if (dialog === null) return parentTop;
  return Math.max(parentTop, dialog.getBoundingClientRect().top + 80);
}

function placeNoticePins() {
  const groups = new Map<HTMLElement, NoticePin[]>();
  for (const pin of noticePins) {
    const key = pin.dialog ?? pin.scrollParent;
    const list = groups.get(key) ?? [];
    list.push(pin);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    list.sort((left, right) => {
      const position = left.anchor.compareDocumentPosition(right.anchor);
      if ((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) return -1;
      if ((position & Node.DOCUMENT_POSITION_PRECEDING) !== 0) return 1;
      return 0;
    });
    let offset = 0;
    for (const pin of list) {
      const parentRect = pin.scrollParent.getBoundingClientRect();
      const dialogRect = pin.dialog?.getBoundingClientRect() ?? null;
      const pageRect = pin.page?.getBoundingClientRect() ?? null;
      const host = dialogRect ?? pageRect ?? parentRect;
      const inset = dialogRect !== null ? 24 : pageRect !== null ? 32 : 16;
      const baseTop = stickLine(pin.scrollParent, pin.dialog);
      const height = pin.banner.offsetHeight;
      const limitBottom = (dialogRect ?? parentRect).bottom - height - 12;
      const top = Math.min(baseTop + offset, Math.max(baseTop, limitBottom));
      pin.banner.style.top = `${top}px`;
      pin.banner.style.left = `${host.left + inset}px`;
      pin.banner.style.width = `${Math.max(160, host.width - inset * 2)}px`;
      offset += height + 8;
    }
  }
}

function scrolledPast(
  anchor: HTMLElement,
  scrollParent: HTMLElement,
  dialog: HTMLElement | null,
  pinned: boolean,
): boolean {
  const top = anchor.getBoundingClientRect().top;
  const stick = stickLine(scrollParent, dialog);
  return pinned ? top < stick + 8 : top < stick - 8;
}

export function Notice({ tone = "info", follow = true, children }: NoticeProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLParagraphElement>(null);
  const pinnedRef = useRef(false);
  const [pinned, setPinned] = useState(false);
  const box = cn("rounded-lg border px-3.5 py-2.5 text-sm", noticeToneClass[tone]);

  useLayoutEffect(() => {
    if (!follow) return;
    const anchor = anchorRef.current;
    if (anchor === null) return;
    const scrollParent = scrollParentOf(anchor);
    if (scrollParent === null) return;
    const dialog = anchor.closest("[role='dialog']");
    const dialogNode = dialog instanceof HTMLElement ? dialog : null;

    // 안내가 스크롤 영역 위로 나가면 그 자리에 붙여 둔다.
    const update = () => {
      const next = scrolledPast(anchor, scrollParent, dialogNode, pinnedRef.current);
      if (next === pinnedRef.current) return;
      pinnedRef.current = next;
      setPinned(next);
    };
    update();
    document.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [follow, children]);

  useLayoutEffect(() => {
    if (!pinned) return;
    const anchor = anchorRef.current;
    const banner = bannerRef.current;
    if (anchor === null || banner === null) return;
    const scrollParent = scrollParentOf(anchor);
    if (scrollParent === null) return;
    const dialog = anchor.closest("[role='dialog']");
    const page = dialog === null ? anchor.closest(".page-container") : null;
    const pin: NoticePin = {
      anchor,
      banner,
      scrollParent,
      dialog: dialog instanceof HTMLElement ? dialog : null,
      page: page instanceof HTMLElement ? page : null,
    };
    noticePins.add(pin);
    placeNoticePins();
    const onMove = () => placeNoticePins();
    document.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    const observer = new ResizeObserver(onMove);
    observer.observe(scrollParent);
    return () => {
      noticePins.delete(pin);
      observer.disconnect();
      document.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
      placeNoticePins();
    };
  }, [pinned, children]);

  if (!follow) {
    return (
      <p role={tone === "error" ? "alert" : "status"} className={cn("mb-4", box)}>
        {children}
      </p>
    );
  }

  return (
    <div ref={anchorRef} className="mb-4">
      <p
        role={pinned ? undefined : tone === "error" ? "alert" : "status"}
        aria-hidden={pinned || undefined}
        className={cn(box, pinned && "invisible print:visible")}
      >
        {children}
      </p>
      {pinned && createPortal(
        <p
          ref={bannerRef}
          role={tone === "error" ? "alert" : "status"}
          className={cn(
            box,
            "fixed shadow-md print:hidden",
            anchorRef.current?.closest("[role='dialog']") !== null ? "z-[60]" : "z-30",
          )}
        >
          {children}
        </p>,
        document.body,
      )}
    </div>
  );
}
