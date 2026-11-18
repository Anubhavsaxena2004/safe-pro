import type { Metadata } from "next";
import { findBooking } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Field } from "@/components/ui";

export const metadata: Metadata = { title: "Track your booking" };

export default function TrackLookupPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-md px-4 py-10">
        <h1 className="text-2xl font-extrabold text-slate-900">Track your booking</h1>
        <p className="mt-1 mb-6 text-sm text-slate-600">Enter the booking ID you received and the mobile number you booked with.</p>
        <div className="card">
          <ActionForm action={findBooking} className="space-y-4">
            <Field label="Booking ID" htmlFor="ref">
              <input id="ref" name="ref" required placeholder="KD-XXXXXX" autoCapitalize="characters" className="input uppercase" />
            </Field>
            <Field label="Mobile number" htmlFor="phone">
              <input id="phone" name="phone" required inputMode="tel" autoComplete="tel" className="input" />
            </Field>
            <SubmitButton className="w-full" pendingText="Searching…">
              Find my booking
            </SubmitButton>
          </ActionForm>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
