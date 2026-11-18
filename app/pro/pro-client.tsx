"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FormMessage } from "@/components/forms";
import { Field } from "@/components/ui";
import { getPosition, hasLocationPermission } from "@/lib/client/geo";
import { compressImage } from "@/lib/client/image";
import type { FormState } from "@/lib/types";
import { cn } from "@/lib/utils";
import { checkIn, completeJob, deleteJobPhoto, pingLocation, setOnline, uploadJobPhoto } from "./actions";

// ---------- Navigation ----------

const NAV = [
  { href: "/pro", label: "Jobs", icon: "M3 7h18M3 12h18M3 17h12" },
  { href: "/pro/earnings", label: "Earnings", icon: "M12 3v18M17 7H9.5a3 3 0 0 0 0 6h5a3 3 0 0 1 0 6H6" },
  { href: "/pro/profile", label: "Profile", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-lg grid-cols-3">
        {NAV.map((item) => {
          const active = item.href === "/pro" ? pathname === "/pro" || pathname.startsWith("/pro/jobs") : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("flex flex-col items-center gap-0.5 py-2.5 text-xs font-bold", active ? "text-brand-700" : "text-slate-500")}
            >
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// ---------- Availability ----------

export function OnlineToggle({ online }: { online: boolean }) {
  const [pending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  return (
    <div className="card flex items-center justify-between gap-4">
      <div>
        <p className="font-extrabold text-slate-900">{online ? "You're online" : "You're offline"}</p>
        <p className="text-sm text-slate-500">{online ? "You can receive new jobs." : "Go online to receive new jobs."}</p>
        {note && <p className="mt-1 text-xs font-semibold text-amber-700">{note}</p>}
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
        className={cn("relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-60", online ? "bg-emerald-500" : "bg-slate-300")}
      >
        <span className={cn("absolute top-1 size-6 rounded-full bg-white shadow transition-all", online ? "left-7" : "left-1")} />
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

// ---------- Job actions ----------

export function CheckInButton({ bookingId }: { bookingId: number }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<FormState>();
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className="btn btn-primary w-full py-3 text-base"
        onClick={() =>
          start(async () => {
            const pos = await getPosition();
            setState(await checkIn(bookingId, pos?.lat ?? null, pos?.lng ?? null));
          })
        }
      >
        {pending ? "Getting your location…" : "I've arrived · Check in"}
      </button>
      <p className="mt-2 text-center text-xs text-slate-500">Your location is recorded when you check in.</p>
      <FormMessage state={state} />
    </div>
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
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={pending} onClick={() => pick("before")} className="btn btn-secondary py-3">
          + Before photo
        </button>
        <button type="button" disabled={pending} onClick={() => pick("after")} className="btn btn-secondary py-3">
          + After photo
        </button>
      </div>
      {pending && <p className="mt-2 text-sm text-slate-500">Uploading…</p>}
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
          <span className="absolute left-1 top-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">{p.kind}</span>
          {canDelete && (
            <button
              type="button"
              disabled={pending}
              aria-label="Remove photo"
              onClick={() => confirm("Remove this photo?") && start(async () => void (await deleteJobPhoto(p.id)))}
              className="absolute top-1 right-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-sm font-bold text-white"
            >
              ×
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
      <Field label="Work notes & measurements" htmlFor="pro_notes">
        <textarea
          id="pro_notes"
          name="pro_notes"
          rows={4}
          placeholder="What you installed or checked, measurements, advice for the parents"
          className="input"
        />
      </Field>
      <Field label="Customer's 4-digit code" htmlFor="code" hint="Ask the customer for the code shown on their booking page.">
        <input
          id="code"
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          pattern="\d{4}"
          className="input text-center text-2xl font-extrabold tracking-[0.5em]"
        />
      </Field>
      <button type="submit" disabled={pending} className="btn btn-primary w-full py-3 text-base">
        {pending ? "Completing…" : "Complete job"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
