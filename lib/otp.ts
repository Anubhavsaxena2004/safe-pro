import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { sql } from "./db";
import { appSecret } from "./secret";

export type OtpPurpose = "pro_login" | "pro_register" | "booking" | "aadhaar";

const OTP_TTL_MINUTES = 10;
export const RESEND_SECONDS = 30;
const MAX_ATTEMPTS = 5;
const MAX_PER_HOUR = 6;

/** Demo mode (the default): the code is shown on screen instead of being sent by SMS. */
export function isDemoOtp() {
  return process.env.OTP_MODE !== "live";
}

/** Demo mode (the default): Aadhaar verification is simulated, nothing is sent to UIDAI. */
export function isDemoAadhaar() {
  return process.env.AADHAAR_MODE !== "live";
}

const keyed = (value: string) => createHmac("sha256", appSecret()).update(value).digest("hex");

/** Aadhaar numbers are never stored; OTP rows use a keyed hash instead. */
export function aadhaarTarget(aadhaar: string) {
  return `aadhaar:${keyed(`aadhaar:${aadhaar}`).slice(0, 40)}`;
}

type Result = { ok: true; demoCode?: string } | { ok: false; error: string };

/**
 * Creates a 6-digit code for (purpose, target). In demo mode the code is returned so the
 * screen can show it; otherwise `deliver` sends it (SMS / Aadhaar provider).
 */
export async function issueOtp(purpose: OtpPurpose, target: string, demo: boolean, deliver: (code: string) => Promise<void>): Promise<Result> {
  await sql`delete from otp_requests where created_at < now() - interval '1 day'`;
  const [limits] = await sql<{ wait: number | null; last_hour: number }[]>`
    select
      (select ceil(extract(epoch from (max(created_at) + make_interval(secs => ${RESEND_SECONDS}) - now())))::int
         from otp_requests where purpose = ${purpose} and target = ${target}) as wait,
      (select count(*)::int from otp_requests where target = ${target} and created_at > now() - interval '1 hour') as last_hour`;
  if (limits.wait && limits.wait > 0) return { ok: false, error: `Please wait ${limits.wait}s before asking for a new code.` };
  if (limits.last_hour >= MAX_PER_HOUR) return { ok: false, error: "Too many codes requested. Please try again in an hour." };

  const code = String(randomInt(100000, 1000000));
  if (!demo) {
    try {
      await deliver(code);
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
  await sql`
    insert into otp_requests (purpose, target, code_hash, expires_at)
    values (${purpose}, ${target}, ${keyed(`${purpose}:${target}:${code}`)}, now() + make_interval(mins => ${OTP_TTL_MINUTES}))`;
  return demo ? { ok: true, demoCode: code } : { ok: true };
}

export async function checkOtp(purpose: OtpPurpose, target: string, code: string): Promise<Result> {
  if (!/^\d{6}$/.test(code)) return { ok: false, error: "Enter the 6-digit code." };
  const [row] = await sql<{ id: number; code_hash: string; attempts: number }[]>`
    select id, code_hash, attempts from otp_requests
    where purpose = ${purpose} and target = ${target} and verified_at is null and expires_at > now()
    order by created_at desc limit 1`;
  if (!row) return { ok: false, error: "This code has expired. Please ask for a new one." };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many wrong attempts. Please ask for a new code." };

  await sql`update otp_requests set attempts = attempts + 1 where id = ${row.id}`;
  const expected = Buffer.from(row.code_hash);
  const actual = Buffer.from(keyed(`${purpose}:${target}:${code}`));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    const left = MAX_ATTEMPTS - row.attempts - 1;
    return { ok: false, error: left > 0 ? `Wrong code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Wrong code. Please ask for a new one." };
  }
  await sql`update otp_requests set verified_at = now() where id = ${row.id}`;
  return { ok: true };
}

// A short-lived signed "proof" that a number was verified, carried in a hidden form field
// so the final form submit can trust it without a second OTP.

const key = () => new TextEncoder().encode(appSecret());

export function signProof(purpose: OtpPurpose, subject: string) {
  return new SignJWT({ p: purpose }).setProtectedHeader({ alg: "HS256" }).setSubject(subject).setIssuedAt().setExpirationTime("30m").sign(key());
}

export async function readProof(token: unknown, purpose: OtpPurpose): Promise<string | null> {
  if (typeof token !== "string" || !token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    return payload.p === purpose && typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
