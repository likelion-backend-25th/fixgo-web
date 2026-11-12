import type { ReactNode } from "react";
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

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: string }) {
  return (
    <p
      className={cn(
        "mb-4 rounded-lg border px-3.5 py-2.5 text-sm",
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-blue-200 bg-blue-50 text-blue-800",
      )}
    >
      {children}
    </p>
  );
}
