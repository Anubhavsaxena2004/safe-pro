import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, PageTitle, ProStatusBadge } from "@/components/ui";
import { sql } from "@/lib/db";
import type { City, Pro, ProStatus } from "@/lib/types";
import { cn, fmtDateTime, mapsPointUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Safe Pros" };

const TABS: [ProStatus | "", string][] = [
  ["", "All"],
  ["pending", "Pending review"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["suspended", "Suspended"],
];

type Row = Pro & { done: number; active: number; avg_rating: number | null };

export default async function AdminProsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");
  const status = TABS.some(([v]) => v === one(sp.status)) ? one(sp.status) : "";
  const city = one(sp.city);
  const q = one(sp.q).slice(0, 100);

  const [pros, cities, counts] = await Promise.all([
    sql<Row[]>`
      select p.*,
        (select count(*)::int from bookings b where b.pro_id = p.id and b.status = 'completed') as done,
        (select count(*)::int from bookings b where b.pro_id = p.id and b.status in ('assigned', 'accepted', 'in_progress')) as active,
        (select round(avg(rating), 1)::float8 from bookings b where b.pro_id = p.id and b.rating is not null) as avg_rating
      from pros p
      where true
        ${status ? sql`and p.status = ${status}` : sql``}
        ${city ? sql`and p.city = ${city}` : sql``}
        ${q ? sql`and (p.name ilike ${"%" + q + "%"} or p.phone ilike ${"%" + q + "%"} or p.pincode = ${q})` : sql``}
      order by (p.status = 'pending') desc, p.created_at desc
      limit 300`,
    sql<City[]>`select * from cities order by name`,
    sql<{ status: string; n: number }[]>`select status, count(*)::int as n from pros group by status`,
  ]);
  const countOf = (s: string) => (s ? (counts.find((c) => c.status === s)?.n ?? 0) : counts.reduce((a, c) => a + c.n, 0));

  return (
    <>
      <PageTitle title="Safe Pros" subtitle="Registrations, KYC approval and field status" />

      <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([value, label]) => (
          <Link
            key={value}
            href={`/admin/pros${value ? `?status=${value}` : ""}`}
            className={cn("tab", status === value && "tab-active")}
          >
            {label} <span className="opacity-70">{countOf(value)}</span>
          </Link>
        ))}
      </div>

      <form className="mb-4 flex flex-wrap gap-2" action="/admin/pros">
        {status && <input type="hidden" name="status" value={status} />}
        <select name="city" defaultValue={city} className="input w-auto">
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <input name="q" defaultValue={q} placeholder="Name, phone or pincode" className="input w-full sm:w-64" />
        <button type="submit" className="btn btn-secondary">
          Filter
        </button>
      </form>

      {pros.length === 0 ? (
        <EmptyState>No Safe Pros found. Share the registration link: /pro/register</EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Safe Pro</th>
                <th>Area</th>
                <th>Experience</th>
                <th>Status</th>
                <th>Availability</th>
                <th>Jobs</th>
                <th>Registered</th>
              </tr>
            </thead>
            <tbody>
              {pros.map((p) => {
                const map = mapsPointUrl(p.last_lat, p.last_lng);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td>
                      <Link href={`/admin/pros/${p.id}`} className="font-extrabold text-brand-700 hover:underline">
                        {p.name}
                      </Link>
                      {p.is_demo && (
                        <span className="ml-1.5">
                          <Badge tone="violet">Demo</Badge>
                        </span>
                      )}
                      <div className="text-xs text-slate-500">{p.phone}</div>
                    </td>
                    <td>
                      {p.city}
                      <div className="text-xs text-slate-500">{p.pincode}</div>
                    </td>
                    <td>{p.experience_years} yrs</td>
                    <td>
                      <ProStatusBadge status={p.status} />
                      <div className="mt-1 text-xs whitespace-nowrap text-slate-500">
                        {p.aadhaar_verified ? `Aadhaar ✓${p.kyc_mode === "demo" ? " (demo)" : ""}` : "Aadhaar not verified"}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      {p.status === "approved" ? <Badge tone={p.is_online ? "green" : "gray"}>{p.is_online ? "Online" : "Offline"}</Badge> : "—"}
                      {p.last_seen_at && (
                        <div className="text-xs text-slate-500">
                          {map ? (
                            <a href={map} target="_blank" rel="noreferrer" className="hover:underline">
                              Seen {fmtDateTime(p.last_seen_at)} ↗
                            </a>
                          ) : (
                            `Seen ${fmtDateTime(p.last_seen_at)}`
                          )}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {p.done} done · {p.active} active
                      {p.avg_rating && <div className="text-xs text-amber-600">★ {p.avg_rating}</div>}
                    </td>
                    <td className="text-xs whitespace-nowrap text-slate-500">{fmtDateTime(p.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
