import type { ReactNode } from "react";

export function PortalFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-10">
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-neutral-200 bg-white px-5 py-6 shadow-sm">
        <p className="text-center text-2xl font-bold tracking-tight text-blue-600">FixGo</p>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function InfoRow({ label, value, emphasize = false }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-neutral-100 py-3 text-sm last:border-b-0">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd className={emphasize ? "text-right text-base font-semibold text-neutral-900" : "text-right font-medium break-all text-neutral-900"}>
        {value}
      </dd>
    </div>
  );
}
