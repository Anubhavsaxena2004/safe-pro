import type { Metadata } from "next";
import Link from "next/link";
import { IconChevronRight, IconWallet } from "@/components/icons";
import { Badge } from "@/components/ui";
import { requirePro } from "@/lib/auth";
import { sql } from "@/lib/db";
import { fmtDateTime, inr } from "@/lib/utils";

export const metadata: Metadata = { title: "Earnings" };

export default async function EarningsPage() {
  const pro = await requirePro();
  const [[totals], jobs] = await Promise.all([
    sql<{ jobs: number; total: number; paid: number; unpaid: number; this_month: number; month_jobs: number; avg_rating: number | null }[]>`
      with m as (select date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' as start)
      select
        count(*)::int as jobs,
        coalesce(sum(pro_payout), 0)::int as total,
        coalesce(sum(pro_payout) filter (where payout_status = 'paid'), 0)::int as paid,
        coalesce(sum(pro_payout) filter (where payout_status = 'unpaid'), 0)::int as unpaid,
        coalesce(sum(pro_payout) filter (where completed_at >= m.start), 0)::int as this_month,
        (count(*) filter (where completed_at >= m.start))::int as month_jobs,
        round(avg(rating), 1)::float8 as avg_rating
      from bookings, m where pro_id = ${pro.id} and status = 'completed'`,
    sql<{ id: number; ref: string; service_name: string; completed_at: Date; pro_payout: number; payout_status: string; rating: number | null }[]>`
      select b.id, b.ref, s.name as service_name, b.completed_at, b.pro_payout, b.payout_status, b.rating
      from bookings b join services s on s.id = b.service_id
      where b.pro_id = ${pro.id} and b.status = 'completed'
      order by b.completed_at desc limit 100`,
  ]);

  return (
    <div className="space-y-5">
      <h1 className="text-[22px] font-extrabold text-slate-900">Earnings</h1>

      <section className="rounded-3xl bg-linear-to-br from-brand-700 to-brand-900 p-5 text-white shadow-lg shadow-brand-900/20">
        <p className="flex items-center gap-2 text-sm font-bold text-brand-100">
          <IconWallet size={18} /> This month
        </p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">{inr(totals.this_month)}</p>
        <p className="mt-1 text-sm text-brand-100">
          {totals.month_jobs} job{totals.month_jobs === 1 ? "" : "s"} completed
        </p>
      </section>

      <div className="grid grid-cols-3 gap-2.5">
        <Tile label="Pending" value={inr(totals.unpaid)} highlight={totals.unpaid > 0} />
        <Tile label="Paid" value={inr(totals.paid)} />
        <Tile label="Jobs done" value={totals.jobs} />
      </div>

      <section>
        <h2 className="section-title mb-2">
          Completed jobs <span className="text-slate-400">· {totals.jobs}</span>
        </h2>
        {jobs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-8 text-center text-sm text-slate-500">
            Completed jobs and payouts will appear here.
          </div>
        ) : (
          <ul className="card divide-y divide-slate-100 p-0 sm:p-0">
            {jobs.map((j) => (
              <li key={j.id}>
                <Link href={`/pro/jobs/${j.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 active:bg-slate-50">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-bold text-slate-900">{j.service_name}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {fmtDateTime(j.completed_at)} · {j.ref}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="font-extrabold text-slate-900">{inr(j.pro_payout)}</span>
                    <Badge tone={j.payout_status === "paid" ? "green" : "amber"}>{j.payout_status === "paid" ? "Paid" : "Pending"}</Badge>
                  </span>
                  <IconChevronRight size={18} className="shrink-0 text-slate-300" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={highlight ? "card border-amber-200 bg-amber-50 p-3" : "card p-3"}>
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-0.5 text-[17px] font-extrabold text-slate-900">{value}</p>
    </div>
  );
}
