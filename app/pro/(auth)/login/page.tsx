import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PhoneOtp } from "@/components/otp";
import { getPro } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log in" };

export default async function ProLoginPage() {
  if (await getPro()) redirect("/pro");
  return (
    <>
      <h1 className="text-2xl font-extrabold text-slate-900">Safe Pro login</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">Log in with your registered mobile number. We&apos;ll send you a one-time code.</p>
      <div className="card">
        <PhoneOtp purpose="pro_login" verifyLabel="Log in" />
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">
        New to Kiddough?{" "}
        <Link href="/pro/register" className="font-bold text-brand-700">
          Register as a Safe Pro
        </Link>
      </p>
      <p className="mt-10 text-center text-xs text-slate-400">
        Kiddough team?{" "}
        <Link href="/admin/login" className="font-bold text-slate-500 underline">
          Admin login
        </Link>
      </p>
    </>
  );
}
