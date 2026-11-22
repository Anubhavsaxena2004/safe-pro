import Link from "next/link";
import { Badge, BookingStatusBadge, EmptyState } from "@/components/ui";
import type { Booking } from "@/lib/types";
import { fmtDate, fmtDateTime, slotLabel } from "@/lib/utils";

export function BookingsTable({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) return <EmptyState>No bookings found.</EmptyState>;
  return (
    <div className="table-wrap">
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
                {b.is_demo && (
                  <span className="ml-1.5">
                    <Badge tone="violet">Demo</Badge>
                  </span>
                )}
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
