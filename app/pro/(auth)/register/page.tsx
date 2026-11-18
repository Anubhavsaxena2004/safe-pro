import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { registerPro } from "@/app/pro/actions";
import { ActionForm, ImageInput, SubmitButton } from "@/components/forms";
import { AadhaarOtp, PhoneOtp } from "@/components/otp";
import { Field } from "@/components/ui";
import { getPro } from "@/lib/auth";
import { sql } from "@/lib/db";
import { isDemoAadhaar } from "@/lib/otp";
import type { City } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Register" };

export default async function ProRegisterPage() {
  if (await getPro()) redirect("/pro");
  const cities = await sql<City[]>`select * from cities where active order by name`;

  return (
    <>
      <h1 className="text-2xl font-extrabold text-slate-900">Become a Safe Pro</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">Register in 2 minutes. Our team verifies your ID before you start getting jobs.</p>
      <ActionForm action={registerPro} className="space-y-4">
        <div className="card space-y-4">
          <h2 className="font-extrabold text-slate-900">Your details</h2>
          <PhoneOtp purpose="pro_register" label="Mobile number (you'll log in with this)" />
          <Field label="Full name (as on Aadhaar)" htmlFor="name">
            <input id="name" name="name" required autoComplete="name" className="input" />
          </Field>
        </div>

        <div className="card space-y-4">
          <h2 className="font-extrabold text-slate-900">Where you work</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="City" htmlFor="city">
              <select id="city" name="city" required defaultValue="" className="input">
                <option value="" disabled>
                  Choose
                </option>
                {cities.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Pincode" htmlFor="pincode">
              <input id="pincode" name="pincode" required inputMode="numeric" pattern="\d{6}" maxLength={6} className="input" />
            </Field>
          </div>
          <Field label="Home address" htmlFor="address">
            <textarea id="address" name="address" required rows={2} autoComplete="street-address" className="input" />
          </Field>
        </div>

        <div className="card space-y-4">
          <h2 className="font-extrabold text-slate-900">Experience</h2>
          <Field label="Years of experience" htmlFor="experience_years">
            <input id="experience_years" name="experience_years" type="number" min={0} max={50} required defaultValue={0} className="input" />
          </Field>
          <Field label="What work have you done? (optional)" htmlFor="about">
            <textarea id="about" name="about" rows={3} placeholder="e.g. carpentry, furniture fitting, CCTV or appliance installation" className="input" />
          </Field>
        </div>

        <div className="card space-y-4">
          <h2 className="font-extrabold text-slate-900">Aadhaar verification (KYC)</h2>
          <AadhaarOtp demo={isDemoAadhaar()} />
          <p className="text-xs text-slate-500">We keep only the last 4 digits of your Aadhaar number.</p>
          <div>
            <span className="label">Photo of your Aadhaar card (front)</span>
            <ImageInput name="id_doc" required />
            <p className="mt-1 text-xs text-slate-500">Only our verification team can see this photo. You may cover the first 8 digits.</p>
          </div>
        </div>

        <label className="flex items-start gap-3 px-1 text-sm text-slate-700">
          <input type="checkbox" name="consent" required className="mt-0.5 size-4 accent-brand-700" />
          <span>I confirm these details are true and I agree to ID and background verification by Kiddough.</span>
        </label>

        <SubmitButton className="w-full py-3 text-base" pendingText="Submitting…">
          Submit registration
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already registered?{" "}
        <Link href="/pro/login" className="font-bold text-brand-700">
          Log in
        </Link>
      </p>
    </>
  );
}
