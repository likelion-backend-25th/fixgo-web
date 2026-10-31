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
          {title !== undefined ? <h2 className="text-sm font-semibold text-neutral-900">{title}</h2> : <span />}
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
