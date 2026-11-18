import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, Stat } from "@/components/ui";
import { requirePro } from "@/lib/auth";
import { sql } from "@/lib/db";
import { fmtDateTime, inr } from "@/lib/utils";

export const metadata: Metadata = { title: "Earnings" };

export default async function EarningsPage() {
  const pro = await requirePro();
  const [[totals], jobs] = await Promise.all([
    sql<{ jobs: number; total: number; paid: number; unpaid: number; this_month: number; avg_rating: number | null }[]>`
      select
        count(*)::int as jobs,
        coalesce(sum(pro_payout), 0)::int as total,
        coalesce(sum(pro_payout) filter (where payout_status = 'paid'), 0)::int as paid,
        coalesce(sum(pro_payout) filter (where payout_status = 'unpaid'), 0)::int as unpaid,
        coalesce(sum(pro_payout) filter (
          where completed_at >= date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'
        ), 0)::int as this_month,
        round(avg(rating), 1)::float8 as avg_rating
      from bookings where pro_id = ${pro.id} and status = 'completed'`,
    sql<{ id: number; ref: string; service_name: string; completed_at: Date; pro_payout: number; payout_status: string; rating: number | null }[]>`
      select b.id, b.ref, s.name as service_name, b.completed_at, b.pro_payout, b.payout_status, b.rating
      from bookings b join services s on s.id = b.service_id
      where b.pro_id = ${pro.id} and b.status = 'completed'
      order by b.completed_at desc limit 100`,
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-slate-900">Earnings</h1>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="This month" value={inr(totals.this_month)} />
        <Stat label="Pending payout" value={inr(totals.unpaid)} highlight={totals.unpaid > 0} />
        <Stat label="Total earned" value={inr(totals.total)} />
        <Stat label="Jobs done" value={`${totals.jobs}${totals.avg_rating ? ` · ★ ${totals.avg_rating}` : ""}`} />
      </div>

      <section>
        <h2 className="mb-2 text-sm font-extrabold tracking-wide text-slate-500 uppercase">Completed jobs</h2>
        {jobs.length === 0 ? (
          <EmptyState>Completed jobs and payouts will appear here.</EmptyState>
        ) : (
          <ul className="card divide-y divide-slate-100 p-0 sm:p-0">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link href={`/pro/jobs/${j.id}`} className="flex items-center justify-between gap-3 px-4 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-slate-900">{j.service_name}</span>
                    <span className="text-xs text-slate-500">
                      {fmtDateTime(j.completed_at)} · {j.ref}
                      {j.rating ? ` · ${"★".repeat(j.rating)}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-extrabold text-slate-900">{inr(j.pro_payout)}</span>
                    <Badge tone={j.payout_status === "paid" ? "green" : "amber"}>{j.payout_status === "paid" ? "Paid" : "Pending"}</Badge>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
