import type { Metadata } from "next";
import Link from "next/link";
import { createBookingAdmin } from "@/app/admin/actions";
import { BookingForm } from "@/components/booking-form";
import { EmptyState, PageTitle } from "@/components/ui";
import { sql } from "@/lib/db";
import type { City, Service } from "@/lib/types";

export const metadata: Metadata = { title: "New booking" };

export default async function NewBookingPage() {
  const [services, cities] = await Promise.all([
    sql<Service[]>`select * from services where active order by sort_order, id`,
    sql<City[]>`select * from cities where active order by name`,
  ]);

  return (
    <div className="max-w-2xl">
      <Link href="/admin/bookings" className="text-sm font-bold text-brand-700">
        ← Bookings
      </Link>
      <PageTitle title="New booking" subtitle="For customers who call or message to book." />
      {services.length === 0 || cities.length === 0 ? (
        <EmptyState>
          Add at least one active service and city in <Link href="/admin/settings" className="font-bold text-brand-700">Settings</Link> first.
        </EmptyState>
      ) : (
        <div className="card">
          <BookingForm
            action={createBookingAdmin}
            services={services}
            cities={cities}
            submitLabel="Create booking"
            consentLabel="The customer agreed to the home visit and to photos of the installed products being taken."
          />
        </div>
      )}
    </div>
  );
}
