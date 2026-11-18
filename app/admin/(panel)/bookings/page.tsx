import type { Metadata } from "next";
import Link from "next/link";
import { autoAssignAll } from "@/app/admin/actions";
import { BookingsTable } from "@/app/admin/bookings-table";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PageTitle } from "@/components/ui";
import { sql } from "@/lib/db";
import type { Booking, City } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Bookings" };

const TABS = [
  ["", "All"],
  ["requested", "Unassigned"],
  ["assigned", "Awaiting acceptance"],
  ["accepted", "Scheduled"],
  ["in_progress", "In progress"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
] as const;

export default async function AdminBookingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
  const status = TABS.some(([v]) => v === one(sp.status)) ? one(sp.status) : "";
  const city = one(sp.city);
  const q = one(sp.q).slice(0, 100);

  const [bookings, cities] = await Promise.all([
    sql<Booking[]>`
      select b.*, s.name as service_name, p.name as pro_name
      from bookings b join services s on s.id = b.service_id left join pros p on p.id = b.pro_id
      where true
        ${status ? sql`and b.status = ${status}` : sql``}
        ${city ? sql`and b.city = ${city}` : sql``}
        ${q ? sql`and (b.ref ilike ${"%" + q + "%"} or b.customer_name ilike ${"%" + q + "%"} or b.customer_phone ilike ${"%" + q + "%"})` : sql``}
      order by ${status === "completed" || status === "cancelled" ? sql`b.updated_at desc` : sql`b.preferred_date asc, b.created_at asc`}
      limit 300`,
    sql<City[]>`select * from cities order by name`,
  ]);

  const qs = (overrides: Record<string, string>) => {
    const params = new URLSearchParams({ ...(status && { status }), ...(city && { city }), ...(q && { q }), ...overrides });
    for (const [k, v] of [...params]) if (!v) params.delete(k);
    const s = params.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <PageTitle
        title="Bookings"
        subtitle={`${bookings.length} shown`}
        action={
          <div className="flex gap-2">
            <a href={`/admin/export${qs({})}`} className="btn btn-secondary">
              Export CSV
            </a>
            <Link href="/admin/bookings/new" className="btn btn-primary">
              + New booking
            </Link>
          </div>
        }
      />

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([value, label]) => (
          <Link key={value} href={`/admin/bookings${qs({ status: value })}`} className={cn("tab", status === value && "tab-active")}>
            {label}
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/admin/bookings">
        {status && <input type="hidden" name="status" value={status} />}
        <select name="city" defaultValue={city} className="input w-auto">
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={q} placeholder="Search ID, name or phone" className="input w-full sm:w-64" />
        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
      </form>

      {/* Kept mounted even when the list empties, so the result message stays visible. */}
      {status === "requested" && (
        <div className="card mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            {bookings.length > 0
              ? "Auto-assign picks an approved Safe Pro in the same city: same pincode first, then online, then the least busy."
              : "Every booking has a Safe Pro."}
          </p>
          <ActionForm action={autoAssignAll}>
            <SubmitButton pendingText="Assigning…">Auto-assign all</SubmitButton>
          </ActionForm>
        </div>
      )}

      <BookingsTable bookings={bookings} />
    </>
  );
}
