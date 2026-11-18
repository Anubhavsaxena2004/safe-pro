"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { FormMessage } from "@/components/forms";
import { IconBriefcase, IconCamera, IconChevronLeft, IconUser, IconWallet, IconX } from "@/components/icons";
import { Logo } from "@/components/site-header";
import { getPosition, hasLocationPermission } from "@/lib/client/geo";
import { compressImage } from "@/lib/client/image";
import type { FormState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { acceptJob, checkIn, completeJob, deleteJobPhoto, pingLocation, rejectJob, setOnline, uploadJobPhoto } from "./actions";

const isJobPage = (pathname: string) => pathname.startsWith("/pro/jobs/");

// ---------- App chrome ----------

export function ProHeader({ name, online }: { name: string; online: boolean }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 pt-safe backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        {isJobPage(pathname) ? (
          <Link href="/pro" className="-ml-2 flex min-h-11 items-center gap-0.5 rounded-lg pr-2 text-[17px] font-extrabold text-slate-900">
            <IconChevronLeft size={26} />
            Jobs
          </Link>
        ) : (
          <Link href="/pro" aria-label="Jobs">
            <Logo sub="Safe Pro" />
          </Link>
        )}
        <Link href="/pro/profile" className="-mr-2 flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-bold text-slate-700">
          <span className={cn("size-2.5 rounded-full", online ? "bg-emerald-500" : "bg-slate-300")} aria-label={online ? "Online" : "Offline"} />
          {name}
        </Link>
      </div>
    </header>
  );
}

const NAV = [
  { href: "/pro", label: "Jobs", Icon: IconBriefcase },
  { href: "/pro/earnings", label: "Earnings", Icon: IconWallet },
  { href: "/pro/profile", label: "Profile", Icon: IconUser },
];

export function BottomNav() {
  const pathname = usePathname();
  if (isJobPage(pathname)) return null; // job screens use their own action bar
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur" aria-label="Main">
      <div className="mx-auto grid h-16 max-w-md grid-cols-3">
        {NAV.map(({ href, label, Icon }) => {
          const active = href === "/pro" ? pathname === "/pro" : pathname.startsWith(href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className="flex flex-col items-center justify-center gap-1">
              <span
                className={cn(
                  "flex h-8 w-16 items-center justify-center rounded-full transition-colors",
                  active ? "bg-brand-100 text-brand-800" : "text-slate-500",
                )}
              >
                <Icon size={22} strokeWidth={active ? 2.4 : 2} />
              </span>
              <span className={cn("text-xs font-bold", active ? "text-brand-800" : "text-slate-500")}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Fixed bar at the bottom of the screen for the main action. */
function ActionBar({ children, message }: { children: ReactNode; message?: FormState }) {
  return (
    <div className="action-bar">
      <div className="mx-auto max-w-md px-4 pt-3">
        <FormMessage state={message} />
      </div>
      <div className="action-bar-inner pt-0">{children}</div>
    </div>
  );
}

// ---------- Availability ----------

export function OnlineToggle({ online }: { online: boolean }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className={cn("card flex items-center justify-between gap-4 transition-colors", online && "border-emerald-200 bg-emerald-50")}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="relative flex size-3 shrink-0">
          {online && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />}
          <span className={cn("relative inline-flex size-3 rounded-full", online ? "bg-emerald-500" : "bg-slate-300")} />
        </span>
        <div className="min-w-0">
          <p className="text-[17px] font-extrabold text-slate-900">{online ? "You're online" : "You're offline"}</p>
          <p className="text-sm text-slate-500">{online ? "You can receive new jobs." : "Go online to receive new jobs."}</p>
          {note && <p className="mt-1 text-xs font-semibold text-amber-700">{note}</p>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={online}
        aria-label="Online"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const pos = online ? null : await getPosition();
            setNote(!online && !pos ? "Turn on location so we can send you jobs nearby." : null);
            await setOnline(!online, pos?.lat ?? null, pos?.lng ?? null);
          })
        }
        className="-mr-1 flex h-11 w-16 shrink-0 items-center justify-center rounded-full disabled:opacity-60"
      >
        <span className={cn("relative h-8 w-14 rounded-full transition-colors", online ? "bg-emerald-500" : "bg-slate-300")}>
          <span className={cn("absolute top-1 left-1 size-6 rounded-full bg-white shadow transition-transform", online && "translate-x-6")} />
        </span>
      </button>
    </div>
  );
}

/** While the app is open and the Safe Pro is online, shares location every 5 minutes. */
export function LocationPing() {
  useEffect(() => {
    let stopped = false;
    async function tick() {
      if (document.visibilityState !== "visible" || !(await hasLocationPermission())) return;
      const pos = await getPosition(15_000);
      if (pos && !stopped) pingLocation(pos.lat, pos.lng).catch(() => {});
    }
    tick();
    const timer = setInterval(tick, 5 * 60 * 1000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, []);
  return null;
}

// ---------- New job: accept / decline ----------

export function AcceptDeclineBar({ bookingId }: { bookingId: number }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>();
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <>
      <ActionBar message={state}>
        <button type="button" onClick={() => setSheetOpen(true)} disabled={pending} className="btn btn-secondary btn-lg flex-1">
          Decline
        </button>
        <button
          type="button"
          disabled={pending}
          className="btn btn-primary btn-lg flex-[2]"
          onClick={() =>
            start(async () => {
              const fd = new FormData();
              fd.set("booking_id", String(bookingId));
              setState(await acceptJob(undefined, fd).catch(() => ({ error: "Couldn't accept. Check your connection." })));
            })
          }
        >
          {pending ? "Accepting…" : "Accept job"}
        </button>
      </ActionBar>
      <DeclineSheet bookingId={bookingId} open={sheetOpen} onClose={() => setSheetOpen(false)} title="Decline this job?" />
    </>
  );
}

export function ReleaseJobButton({ bookingId }: { bookingId: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 w-full rounded-xl text-sm font-bold text-slate-500">
        Can&apos;t make it? Give this job back
      </button>
      <DeclineSheet bookingId={bookingId} open={open} onClose={() => setOpen(false)} title="Give this job back?" />
    </>
  );
}

const DECLINE_REASONS = ["Too far from me", "Not available at that time", "Don't have the right tools", "Other"];

function DeclineSheet({ bookingId, open, onClose, title }: { bookingId: number; open: boolean; onClose: () => void; title: string }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>();
  const [reason, setReason] = useState(DECLINE_REASONS[0]);
  const [details, setDetails] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  const needsDetails = reason === "Other";

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="decline-title">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300" />
        <div className="flex items-center justify-between gap-3">
          <h2 id="decline-title" className="text-lg font-extrabold text-slate-900">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex size-11 items-center justify-center rounded-full text-slate-500">
            <IconX size={22} />
          </button>
        </div>
        <p className="mt-1 text-sm text-slate-600">It will be offered to another Safe Pro. Please tell us why.</p>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData();
            fd.set("booking_id", String(bookingId));
            fd.set("reason", needsDetails ? details.trim() : details.trim() ? `${reason}: ${details.trim()}` : reason);
            start(async () => setState(await rejectJob(undefined, fd).catch(() => ({ error: "Couldn't send. Check your connection." }))));
          }}
        >
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Reason">
            {DECLINE_REASONS.map((r) => (
              <label key={r} className="chip">
                <input type="radio" name="reason_choice" value={r} checked={reason === r} onChange={() => setReason(r)} className="sr-only" />
                {r}
              </label>
            ))}
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            required={needsDetails}
            rows={2}
            maxLength={250}
            placeholder={needsDetails ? "Tell us the reason" : "Anything else? (optional)"}
            className="input"
          />
          <FormMessage state={state} />
          <button type="submit" disabled={pending || (needsDetails && !details.trim())} className="btn btn-danger btn-lg w-full">
            {pending ? "Sending…" : "Give job back"}
          </button>
        </form>
      </div>
    </>
  );
}

// ---------- Visit ----------

export function CheckInBar({ bookingId }: { bookingId: number }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>();
  return (
    <ActionBar message={state}>
      <div className="flex-1">
        <button
          type="button"
          disabled={pending}
          className="btn btn-primary btn-lg w-full"
          onClick={() =>
            start(async () => {
              const pos = await getPosition();
              setState(await checkIn(bookingId, pos?.lat ?? null, pos?.lng ?? null).catch(() => ({ error: "Couldn't check in. Try again." })));
            })
          }
        >
          {pending ? "Getting your location…" : "I've arrived · Check in"}
        </button>
        <p className="mt-1.5 text-center text-xs text-slate-500">Your location is recorded when you check in.</p>
      </div>
    </ActionBar>
  );
}

export function PhotoUploader({ bookingId }: { bookingId: number }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>();
  const inputRef = useRef<HTMLInputElement>(null);
  const kindRef = useRef<"before" | "after">("before");

  function pick(kind: "before" | "after") {
    kindRef.current = kind;
    inputRef.current?.click();
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.currentTarget.files ?? []);
          e.currentTarget.value = "";
          if (files.length === 0) return;
          const kind = kindRef.current;
          setState(undefined);
          start(async () => {
            for (const file of files) {
              const fd = new FormData();
              fd.set("booking_id", String(bookingId));
              fd.set("kind", kind);
              fd.set("photo", await compressImage(file));
              const result = await uploadJobPhoto(fd).catch(() => ({ error: "Upload failed. Check your connection and try again." }));
              if (result?.error) return setState(result);
            }
            setState({ message: files.length > 1 ? `${files.length} photos added.` : "Photo added." });
          });
        }}
      />
      <div className="grid grid-cols-2 gap-3">
        {(["before", "after"] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            disabled={pending}
            onClick={() => pick(kind)}
            className="flex h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-700 transition active:scale-[0.98] disabled:opacity-60"
          >
            <IconCamera size={26} className="text-brand-700" />
            <span className="text-sm font-extrabold">{kind === "before" ? "Before photo" : "After photo"}</span>
          </button>
        ))}
      </div>
      {pending && <p className="mt-2 text-center text-sm font-semibold text-slate-500">Uploading…</p>}
      <FormMessage state={state} />
    </div>
  );
}

export function JobPhotos({ photos, canDelete }: { photos: { id: number; kind: string; src: string }[]; canDelete: boolean }) {
  const [pending, start] = useTransition();
  if (photos.length === 0) return <p className="text-sm text-slate-500">No photos yet.</p>;
  return (
    <div className="grid grid-cols-3 gap-2">
      {photos.map((p) => (
        <div key={p.id} className="relative overflow-hidden rounded-xl bg-slate-100">
          <a href={p.src} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={`${p.kind} photo`} className="aspect-square w-full object-cover" loading="lazy" />
          </a>
          <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white uppercase">
            {p.kind}
          </span>
          {canDelete && (
            <button
              type="button"
              disabled={pending}
              aria-label="Remove photo"
              onClick={() => confirm("Remove this photo?") && start(async () => void (await deleteJobPhoto(p.id)))}
              className="absolute top-0 right-0 flex size-11 items-center justify-center"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white">
                <IconX size={15} strokeWidth={2.8} />
              </span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function CompleteJobForm({ bookingId }: { bookingId: number }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>();
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.error) messageRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [state]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setState(undefined);
        start(async () => {
          const pos = await getPosition();
          if (pos) {
            fd.set("lat", String(pos.lat));
            fd.set("lng", String(pos.lng));
          }
          setState(await completeJob(fd).catch(() => ({ error: "Something went wrong. Please try again." })));
        });
      }}
    >
      <input type="hidden" name="booking_id" value={bookingId} />
      <div>
        <label className="label" htmlFor="pro_notes">
          Work notes &amp; measurements
        </label>
        <textarea
          id="pro_notes"
          name="pro_notes"
          rows={4}
          placeholder="What you installed or checked, measurements, advice for the parents"
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="code">
          Customer&apos;s 4-digit code
        </label>
        <input
          id="code"
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          pattern="\d{4}"
          placeholder="• • • •"
          className="input h-14 text-center font-mono text-2xl font-extrabold tracking-[0.6em] placeholder:tracking-[0.3em]"
        />
        <p className="mt-1.5 text-xs text-slate-500">Ask the customer for the code shown on their booking page.</p>
      </div>
      <div ref={messageRef} className="scroll-mb-32">
        <FormMessage state={state} />
      </div>
      <div className="action-bar">
        <div className="action-bar-inner">
          <button type="submit" disabled={pending} className="btn btn-primary btn-lg w-full">
            {pending ? "Completing…" : "Complete job"}
          </button>
        </div>
      </div>
    </form>
  );
}
