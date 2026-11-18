import Link from "next/link";
import type { ReactNode } from "react";
import type { BookingStatus, ProStatus } from "@/lib/types";
import { BOOKING_STATUS_LABEL, cn, PRO_STATUS_LABEL } from "@/lib/utils";

type Tone = "gray" | "amber" | "blue" | "indigo" | "violet" | "green" | "red";

const TONES: Record<Tone, string> = {
  gray: "bg-slate-100 text-slate-700",
  amber: "bg-amber-100 text-amber-800",
  blue: "bg-sky-100 text-sky-800",
  indigo: "bg-indigo-100 text-indigo-800",
  violet: "bg-violet-100 text-violet-800",
  green: "bg-emerald-100 text-emerald-800",
  red: "bg-red-100 text-red-700",
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold", TONES[tone])}>
      {children}
    </span>
  );
}

const BOOKING_TONE: Record<BookingStatus, Tone> = {
  requested: "amber",
  assigned: "blue",
  accepted: "indigo",
  in_progress: "violet",
  completed: "green",
  cancelled: "gray",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={BOOKING_TONE[status]}>{BOOKING_STATUS_LABEL[status]}</Badge>;
}

const PRO_TONE: Record<ProStatus, Tone> = { pending: "amber", approved: "green", rejected: "red", suspended: "gray" };

export function ProStatusBadge({ status }: { status: ProStatus }) {
  return <Badge tone={PRO_TONE[status]}>{PRO_STATUS_LABEL[status]}</Badge>;
}

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("card", className)}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-extrabold text-slate-900">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, href, highlight }: { label: string; value: ReactNode; href?: string; highlight?: boolean }) {
  const body = (
    <div className={cn("card h-full", highlight && "border-amber-300 bg-amber-50", href && "transition hover:border-brand-500")}>
      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-500">{children}</div>;
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function InfoList({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-slate-100 text-sm">
      {items.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5 py-2 sm:flex-row sm:gap-4">
          <dt className="shrink-0 font-semibold text-slate-500 sm:w-40">{label}</dt>
          <dd className="min-w-0 break-words text-slate-900">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PageTitle({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const STEPS: { status: BookingStatus; label: string }[] = [
  { status: "requested", label: "Requested" },
  { status: "assigned", label: "Safe Pro assigned" },
  { status: "accepted", label: "Scheduled" },
  { status: "in_progress", label: "In progress" },
  { status: "completed", label: "Completed" },
];

/** Progress tracker shown to customers. */
export function StatusSteps({ status }: { status: BookingStatus }) {
  if (status === "cancelled") return <Badge tone="gray">This booking was cancelled</Badge>;
  const current = STEPS.findIndex((s) => s.status === status);
  return (
    <ol className="space-y-3">
      {STEPS.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step.status} className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                done ? "bg-brand-700 text-white" : "bg-slate-200 text-slate-500",
              )}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={cn("text-sm", i === current ? "font-extrabold text-slate-900" : done ? "text-slate-700" : "text-slate-400")}>
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function PhotoGrid({ photos }: { photos: { id: number; kind: string; src: string }[] }) {
  if (photos.length === 0) return <p className="text-sm text-slate-500">No photos yet.</p>;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {photos.map((p) => (
        <a key={p.id} href={p.src} target="_blank" rel="noreferrer" className="group relative block overflow-hidden rounded-xl bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.src} alt={`${p.kind} photo`} className="aspect-square w-full object-cover transition group-hover:scale-105" loading="lazy" />
          <span className="absolute left-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">{p.kind}</span>
        </a>
      ))}
    </div>
  );
}
