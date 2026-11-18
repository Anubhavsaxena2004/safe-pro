import type { Metadata } from "next";
import { createBooking } from "@/app/actions";
import { BookingForm } from "@/components/booking-form";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { EmptyState } from "@/components/ui";
import { sql } from "@/lib/db";
import type { City, Service } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Book a home visit" };

export default async function BookPage() {
  const [services, cities] = await Promise.all([
    sql<Service[]>`select * from services where active order by sort_order, id`,
    sql<City[]>`select * from cities where active order by name`,
  ]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 pt-5 pb-8 sm:pt-8">
        <h1 className="text-[26px] leading-tight font-extrabold text-slate-900">Book a home visit</h1>
        <p className="mt-1.5 mb-5 text-[15px] text-slate-600">A verified Kiddough Safe Pro will visit at your chosen time. We&apos;ll confirm the booking by phone.</p>
        {services.length === 0 || cities.length === 0 ? (
          <EmptyState>Bookings are not open yet. Please check back soon.</EmptyState>
        ) : (
          <div className="sm:rounded-2xl sm:border sm:border-slate-200 sm:bg-white sm:p-6 sm:shadow-sm">
            <BookingForm
              action={createBooking}
              services={services}
              cities={cities}
              submitLabel="Confirm booking"
              verifyPhone
              stickySubmit
              consentLabel="I agree to a Kiddough Safe Pro visiting my home, and to photos of the installed products (not of my children) being taken for the service report."
            />
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
