"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { IconCamera } from "@/components/icons";
import { compressImage } from "@/lib/client/image";
import type { FormState } from "@/lib/types";
import { cn } from "@/lib/utils";

const PendingContext = createContext(false);

type Action = (prev: FormState, fd: FormData) => Promise<FormState>;

/**
 * Form that submits to a server action and shows its error/success message.
 * Unlike a bare <form action>, it keeps what the user typed when there is an error.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, setState] = useState<FormState>();
  const [pending, startTransition] = useTransition();
  const messageRef = useRef<HTMLDivElement>(null);

  // On a phone the message can be below the fold or behind a sticky button: bring it into view.
  useEffect(() => {
    if (state?.error) messageRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [state]);

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        setState(undefined);
        startTransition(async () => {
          let result: FormState;
          try {
            result = await action(undefined, fd);
          } catch (err) {
            // Let Next.js handle redirects; show anything else as a friendly error.
            if (String((err as { digest?: string })?.digest ?? "").startsWith("NEXT_")) throw err;
            result = { error: "Something went wrong. Please check your connection and try again." };
          }
          setState(result);
          if (resetOnSuccess && !result?.error) form.reset();
        });
      }}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      <div ref={messageRef} className="scroll-mb-28">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (state?.error) {
    return (
      <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
        {state.error}
      </p>
    );
  }
  if (state?.message) {
    return <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{state.message}</p>;
  }
  return null;
}

export function SubmitButton({
  children,
  pendingText = "Please wait…",
  variant = "primary",
  className,
  confirm,
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  className?: string;
  confirm?: string;
}) {
  const pending = useContext(PendingContext);
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn("btn", `btn-${variant}`, className)}
      onClick={confirm ? (e) => !window.confirm(confirm) && e.preventDefault() : undefined}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/** File input for photos: compresses in the browser and shows a preview. */
export function ImageInput({ name, required, capture }: { name: string; required?: boolean; capture?: boolean }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lastUrl = useRef<string | null>(null);

  useEffect(() => () => {
    if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
  }, []);

  return (
    <label
      className={cn(
        "relative flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-center transition active:scale-[0.99] has-focus-visible:ring-4 has-focus-visible:ring-brand-100",
        preview ? "border-brand-300 bg-brand-50/50" : "border-slate-300 bg-slate-50",
      )}
    >
      {preview ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Selected" className="max-h-48 rounded-xl object-contain" />
          <span className="text-sm font-bold text-brand-700">Change photo</span>
        </>
      ) : (
        <>
          <IconCamera size={28} className="text-brand-700" />
          <span className="text-[15px] font-extrabold text-slate-800">{busy ? "Preparing photo…" : "Tap to take or choose a photo"}</span>
          <span className="text-xs text-slate-500">Make sure all text is readable</span>
        </>
      )}
      <input
        type="file"
        name={name}
        accept="image/*"
        required={required}
        {...(capture ? { capture: "environment" as const } : {})}
        className="sr-only"
        onChange={async (e) => {
          const input = e.currentTarget;
          const file = input.files?.[0];
          if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
          if (!file) return setPreview(null);
          setBusy(true);
          try {
            const small = await compressImage(file);
            try {
              const dt = new DataTransfer();
              dt.items.add(small);
              input.files = dt.files;
            } catch {
              // Older browsers: keep the original file.
            }
            lastUrl.current = URL.createObjectURL(small);
            setPreview(lastUrl.current);
          } finally {
            setBusy(false);
          }
        }}
      />
    </label>
  );
}
