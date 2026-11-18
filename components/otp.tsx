"use client";

import { useEffect, useId, useState, useTransition } from "react";
import {
  sendAadhaarOtp,
  sendPhoneOtp,
  verifyAadhaarOtp,
  verifyPhoneOtp,
  type OtpSendResult,
  type OtpVerifyResult,
} from "@/app/otp-actions";

type Step = "enter" | "sent" | "verified";

/** Only blame the connection when the device really is offline; otherwise it's a server problem. */
function failureMessage(action: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return "You're offline. Check your internet connection and try again.";
  return `We couldn't ${action} right now. Please try again in a minute.`;
}

interface FlowProps<P extends string> {
  purpose: P;
  label: string;
  hint?: string;
  placeholder: string;
  prefix?: string;
  inputMode: "tel" | "numeric";
  maxLength: number;
  /** Hidden field names submitted with the surrounding form once verified. */
  valueName?: string;
  tokenName?: string;
  verifyLabel: string;
  verifiedSuffix?: string;
  demoNote: string;
  send: (purpose: P, value: string) => Promise<OtpSendResult>;
  verify: (purpose: P, value: string, code: string) => Promise<OtpVerifyResult>;
}

/** Enter a value → get a code → type it → verified. In demo mode the code is shown on screen. */
function OtpFlow<P extends string>(props: FlowProps<P>) {
  const id = useId();
  const [value, setValue] = useState("");
  const [step, setStep] = useState<Step>("enter");
  const [code, setCode] = useState("");
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState("");
  const [token, setToken] = useState("");
  const [verifiedLabel, setVerifiedLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const send = () =>
    start(async () => {
      setError(null);
      const r = await props.send(props.purpose, value).catch((): OtpSendResult => ({ error: failureMessage("send the code") }));
      if (r.error) return setError(r.error);
      setDemoCode(r.demoCode ?? null);
      setSentTo(r.sentTo ?? "");
      setCode("");
      setStep("sent");
      setCooldown(30);
    });

  const verify = () =>
    start(async () => {
      setError(null);
      const r = await props
        .verify(props.purpose, value, code)
        .catch((): OtpVerifyResult => ({ error: failureMessage("check the code") }));
      if (r?.error) return setError(r.error);
      if (r?.token) {
        setToken(r.token);
        setVerifiedLabel(r.label ?? value);
        setStep("verified");
        setDemoCode(null);
      }
    });

  const reset = () => {
    setStep("enter");
    setToken("");
    setCode("");
    setDemoCode(null);
    setError(null);
  };

  // Enter inside these inputs must not submit the surrounding form.
  const onEnter = (action: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="space-y-2">
      <label className="label" htmlFor={`${id}-value`}>
        {props.label}
      </label>
      {props.valueName && <input type="hidden" name={props.valueName} value={step === "verified" ? value : ""} />}
      {props.tokenName && <input type="hidden" name={props.tokenName} value={token} />}

      {step === "verified" ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5">
          <span className="text-sm font-bold text-emerald-800">
            ✓ {verifiedLabel} verified{props.verifiedSuffix ? ` ${props.verifiedSuffix}` : ""}
          </span>
          <button type="button" onClick={reset} className="text-xs font-bold text-brand-700">
            Change
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <div className="flex min-w-0 flex-1 items-center rounded-xl border border-slate-300 bg-white focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
              {props.prefix && <span className="pl-3 text-base font-semibold text-slate-500">{props.prefix}</span>}
              <input
                id={`${id}-value`}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={onEnter(send)}
                inputMode={props.inputMode}
                autoComplete={props.inputMode === "tel" ? "tel-national" : "off"}
                maxLength={props.maxLength}
                placeholder={props.placeholder}
                readOnly={step === "sent"}
                className="w-full min-w-0 rounded-xl bg-transparent px-3 py-2.5 text-base text-slate-900 outline-none read-only:text-slate-500"
              />
            </div>
            {step === "enter" ? (
              <button key="send" type="button" onClick={send} disabled={pending || !value.trim()} className="btn btn-primary shrink-0">
                {pending ? "Sending…" : "Send OTP"}
              </button>
            ) : (
              <button key="change" type="button" onClick={reset} className="btn btn-secondary shrink-0">
                Change
              </button>
            )}
          </div>
          {props.hint && step === "enter" && <p className="text-xs text-slate-500">{props.hint}</p>}

          {step === "sent" && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {demoCode ? (
                <div className="rounded-lg border border-dashed border-amber-400 bg-amber-50 p-3">
                  <p className="text-[11px] font-extrabold tracking-wide text-amber-800 uppercase">Demo mode · {props.demoNote}</p>
                  <p className="mt-1 text-sm text-amber-900">
                    Your OTP is{" "}
                    <span data-demo-otp className="font-mono text-xl font-extrabold tracking-[0.2em] text-slate-900">
                      {demoCode}
                    </span>
                  </p>
                  <button type="button" onClick={() => setCode(demoCode)} className="mt-1 text-xs font-bold text-brand-700 underline">
                    Fill it in for me
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-600">We sent a 6-digit code to {sentTo}.</p>
              )}
              <label className="label mb-0" htmlFor={`${id}-code`}>
                Enter OTP
              </label>
              <div className="flex gap-2">
                <input
                  id={`${id}-code`}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onKeyDown={onEnter(verify)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  className="input min-w-0 flex-1 text-center font-mono text-lg font-extrabold tracking-[0.4em]"
                />
                <button type="button" onClick={verify} disabled={pending || code.length !== 6} className="btn btn-primary shrink-0">
                  {pending ? "Checking…" : props.verifyLabel}
                </button>
              </div>
              <button type="button" onClick={send} disabled={pending || cooldown > 0} className="text-xs font-bold text-brand-700 disabled:text-slate-400">
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
            </div>
          )}
        </>
      )}

      {error && (
        <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** Mobile number + OTP. For "pro_login" a correct code logs the Safe Pro in. */
export function PhoneOtp({
  purpose,
  label = "Mobile number",
  verifyLabel = "Verify",
}: {
  purpose: "pro_login" | "pro_register" | "booking";
  label?: string;
  verifyLabel?: string;
}) {
  return (
    <OtpFlow
      purpose={purpose}
      label={label}
      placeholder="10-digit mobile"
      prefix="+91"
      inputMode="tel"
      maxLength={18} // room for a pasted "+91 98765 43210"; the server normalises it
      valueName="phone"
      tokenName="phone_token"
      verifyLabel={verifyLabel}
      demoNote="no SMS sent"
      send={sendPhoneOtp}
      verify={verifyPhoneOtp}
    />
  );
}

/** Aadhaar number + OTP (simulated in demo mode). Only the last 4 digits are kept. */
export function AadhaarOtp({ demo }: { demo: boolean }) {
  return (
    <OtpFlow
      purpose="aadhaar"
      label="Aadhaar number"
      hint={demo ? "Demo: any 12-digit number starting with 2–9 works. Nothing is sent to UIDAI." : "We'll send an OTP to the mobile number linked to your Aadhaar."}
      placeholder="XXXX XXXX XXXX"
      inputMode="numeric"
      maxLength={14}
      tokenName="aadhaar_token"
      verifyLabel="Verify"
      verifiedSuffix={demo ? "(demo)" : undefined}
      demoNote="nothing sent to UIDAI"
      send={sendAadhaarOtp}
      verify={verifyAadhaarOtp}
    />
  );
}
