"use server";

import { redirect } from "next/navigation";
import { createSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { aadhaarTarget, checkOtp, isDemoAadhaar, isDemoOtp, issueOtp, signProof } from "@/lib/otp";
import { sendAadhaarOtp as deliverAadhaarOtp, sendOtpSms } from "@/lib/providers";
import { normalizePhone } from "@/lib/utils";

export type OtpSendResult = { error?: string; demoCode?: string; sentTo?: string };
export type OtpVerifyResult = { error?: string; token?: string; label?: string } | undefined;

type PhonePurpose = "pro_login" | "pro_register";
const PHONE_PURPOSES: PhonePurpose[] = ["pro_login", "pro_register"];

function cleanCode(code: unknown) {
  return String(code ?? "").replace(/\D/g, "").slice(0, 6);
}

// ---------- Mobile number OTP ----------

export async function sendPhoneOtp(purpose: PhonePurpose, rawPhone: string): Promise<OtpSendResult> {
  if (!PHONE_PURPOSES.includes(purpose)) return { error: "Invalid request." };
  const phone = normalizePhone(String(rawPhone ?? ""));
  if (!phone) return { error: "Enter a valid 10-digit mobile number." };

  const [existing] = await sql`select 1 from pros where phone = ${phone}`;
  if (purpose === "pro_login" && !existing) return { error: "No Safe Pro account uses this number. Please register first." };
  if (purpose === "pro_register" && existing) return { error: "This number is already registered. Please log in instead." };

  const demo = isDemoOtp();
  const result = await issueOtp(purpose, phone, demo, (code) => sendOtpSms(phone, code));
  if (!result.ok) return { error: result.error };
  return { demoCode: result.demoCode, sentTo: `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` };
}

export async function verifyPhoneOtp(purpose: PhonePurpose, rawPhone: string, code: string): Promise<OtpVerifyResult> {
  if (!PHONE_PURPOSES.includes(purpose)) return { error: "Invalid request." };
  const phone = normalizePhone(String(rawPhone ?? ""));
  if (!phone) return { error: "Enter a valid 10-digit mobile number." };

  const result = await checkOtp(purpose, phone, cleanCode(code));
  if (!result.ok) return { error: result.error };

  if (purpose === "pro_login") {
    const [pro] = await sql<{ id: number }[]>`select id from pros where phone = ${phone}`;
    if (!pro) return { error: "No Safe Pro account uses this number." };
    await createSession("pro", pro.id);
    redirect("/pro");
  }
  return { token: await signProof(purpose, phone), label: `+91 ${phone.slice(0, 5)} ${phone.slice(5)}` };
}

// ---------- Aadhaar OTP (demo: simulated, nothing is sent to UIDAI) ----------

function cleanAadhaar(raw: unknown) {
  const digits = String(raw ?? "").replace(/\D/g, "");
  return /^[2-9]\d{11}$/.test(digits) ? digits : null;
}

export async function sendAadhaarOtp(_purpose: "aadhaar", rawAadhaar: string): Promise<OtpSendResult> {
  const aadhaar = cleanAadhaar(rawAadhaar);
  if (!aadhaar) return { error: "Enter a valid 12-digit Aadhaar number." };
  const demo = isDemoAadhaar();
  const result = await issueOtp("aadhaar", aadhaarTarget(aadhaar), demo, (code) => deliverAadhaarOtp(aadhaar, code));
  if (!result.ok) return { error: result.error };
  return { demoCode: result.demoCode, sentTo: "the mobile number linked to this Aadhaar" };
}

export async function verifyAadhaarOtp(_purpose: "aadhaar", rawAadhaar: string, code: string): Promise<OtpVerifyResult> {
  const aadhaar = cleanAadhaar(rawAadhaar);
  if (!aadhaar) return { error: "Enter a valid 12-digit Aadhaar number." };
  const result = await checkOtp("aadhaar", aadhaarTarget(aadhaar), cleanCode(code));
  if (!result.ok) return { error: result.error };
  // Only the last 4 digits ever leave this function.
  const last4 = aadhaar.slice(-4);
  return { token: await signProof("aadhaar", last4), label: `XXXX XXXX ${last4}` };
}
