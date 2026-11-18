import Link from "next/link";
import { IconChevronRight } from "@/components/icons";
import { BookingStatusBadge, EmptyState } from "@/components/ui";
import type { Booking } from "@/lib/types";
import { fmtDate, fmtDateTime, fmtShortDate, slotLabel, slotShort } from "@/lib/utils";

export function BookingsTable({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) return <EmptyState>No bookings found.</EmptyState>;
  return (
    <>
      {/* Phones: one card per booking */}
      <ul className="space-y-2 md:hidden">
        {bookings.map((b) => (
          <li key={b.id}>
            <Link href={`/admin/bookings/${b.id}`} className="card flex items-center gap-3 p-3.5 transition active:scale-[0.99]">
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-brand-700">{b.ref}</span>
                  <BookingStatusBadge status={b.status} />
                </div>
                <p className="mt-1 truncate font-bold text-slate-900">{b.service_name}</p>
                <p className="truncate text-sm text-slate-600">
                  {fmtShortDate(b.preferred_date)} · {slotShort(b.preferred_slot)} · {b.city} {b.pincode}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {b.customer_name} · {b.pro_name ?? "Unassigned"}
                </p>
              </div>
              <IconChevronRight size={18} className="shrink-0 text-slate-300" />
            </Link>
          </li>
        ))}
      </ul>
      <BookingsDesktopTable bookings={bookings} />
    </>
  );
}

function BookingsDesktopTable({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="table-wrap hidden md:block">
      <table className="table">
        <thead>
          <tr>
            <th>Booking</th>
            <th>Visit</th>
            <th>Customer</th>
            <th>Service</th>
            <th>Safe Pro</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id} className="hover:bg-slate-50">
              <td>
                <Link href={`/admin/bookings/${b.id}`} className="font-extrabold text-brand-700 hover:underline">
                  {b.ref}
                </Link>
                <div className="text-xs whitespace-nowrap text-slate-500">{fmtDateTime(b.created_at)}</div>
              </td>
              <td className="whitespace-nowrap">
                {fmtDate(b.preferred_date)}
                <div className="text-xs text-slate-500">{slotLabel(b.preferred_slot).split(" (")[0]}</div>
              </td>
              <td>
                {b.customer_name}
                <div className="text-xs text-slate-500">
                  {b.customer_phone} · {b.city} {b.pincode}
                </div>
              </td>
              <td>{b.service_name}</td>
              <td>{b.pro_name ?? <span className="text-slate-400">Unassigned</span>}</td>
              <td>
                <BookingStatusBadge status={b.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
