import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function PortalFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-10">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-neutral-200 bg-white px-5 py-6 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-sm font-bold text-white">F</span>
          <p className="text-xl font-bold tracking-tight text-neutral-900">FixGo</p>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function InfoRow({
  label,
  value,
  emphasize = false,
  valueClassName,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-neutral-100 py-3 text-sm last:border-b-0">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd
        className={cn(
          emphasize ? "text-right text-base font-semibold" : "text-right font-medium break-all",
          valueClassName ?? "text-neutral-900",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
