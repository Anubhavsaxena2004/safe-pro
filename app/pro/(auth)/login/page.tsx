import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconShieldCheck } from "@/components/icons";
import { PhoneOtp } from "@/components/otp";
import { getPro } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Log in" };

export default async function ProLoginPage() {
  if (await getPro()) redirect("/pro");
  return (
    <>
      <div className="mb-7">
        <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-800">
          <IconShieldCheck size={26} />
        </div>
        <h1 className="text-[26px] leading-tight font-extrabold text-slate-900">Safe Pro login</h1>
        <p className="mt-1.5 text-[15px] text-slate-600">Log in with your registered mobile number. We&apos;ll send you a one-time code.</p>
      </div>

      <PhoneOtp purpose="pro_login" verifyLabel="Log in" />

      <div className="mt-auto pt-10 text-center">
        <p className="text-[15px] text-slate-600">New to Kiddough?</p>
        <Link href="/pro/register" className="btn btn-secondary btn-lg mt-2 w-full">
          Register as a Safe Pro
        </Link>
        <p className="mt-6 text-xs text-slate-400">
          Kiddough team?{" "}
          <Link href="/admin/login" className="inline-flex min-h-11 items-center px-1 font-bold text-slate-500 underline">
            Admin login
          </Link>
        </p>
      </div>
    </>
  );
}
