import Link from "next/link";
import { BookingsTable } from "@/app/admin/bookings-table";
import { Card, PageTitle, Stat } from "@/components/ui";
import { sql } from "@/lib/db";
import type { Booking } from "@/lib/types";
import { inr } from "@/lib/utils";

interface DashboardStats {
  pending_pros: number;
  approved_pros: number;
  online_pros: number;
  unassigned: number;
  awaiting_accept: number;
  today: number;
  in_progress: number;
  completed_month: number;
  revenue_month: number;
  payouts_due: number;
  web_week: number;
}

interface CityRow {
  city: string;
  active: boolean;
  open: number;
  completed: number;
  revenue: number;
  pros: number;
}

export default async function AdminDashboard() {
  const [[s], cities, recent] = await Promise.all([
    sql<DashboardStats[]>`
      with m as (select date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata' as start)
      select
        (select count(*)::int from pros where status = 'pending') as pending_pros,
        (select count(*)::int from pros where status = 'approved') as approved_pros,
        (select count(*)::int from pros where status = 'approved' and is_online) as online_pros,
        (select count(*)::int from bookings where status = 'requested') as unassigned,
        (select count(*)::int from bookings where status = 'assigned') as awaiting_accept,
        (select count(*)::int from bookings where status in ('assigned', 'accepted', 'in_progress')
           and preferred_date = (now() at time zone 'Asia/Kolkata')::date) as today,
        (select count(*)::int from bookings where status = 'in_progress') as in_progress,
        (select count(*)::int from bookings, m where status = 'completed' and completed_at >= m.start) as completed_month,
        (select coalesce(sum(price), 0)::int from bookings, m where status = 'completed' and completed_at >= m.start) as revenue_month,
        (select coalesce(sum(pro_payout), 0)::int from bookings where status = 'completed' and payout_status = 'unpaid') as payouts_due,
        (select count(*)::int from bookings where source = 'shopify' and created_at > now() - interval '7 days') as web_week`,
    sql<CityRow[]>`
      select c.name as city, c.active,
        count(b.id) filter (where b.status in ('requested', 'assigned', 'accepted', 'in_progress'))::int as open,
        count(b.id) filter (where b.status = 'completed')::int as completed,
        coalesce(sum(b.price) filter (where b.status = 'completed'), 0)::int as revenue,
        (select count(*)::int from pros p where p.city = c.name and p.status = 'approved') as pros
      from cities c left join bookings b on b.city = c.name
      group by c.id order by c.active desc, c.name`,
    sql<Booking[]>`
      select b.*, s.name as service_name, p.name as pro_name
      from bookings b join services s on s.id = b.service_id left join pros p on p.id = b.pro_id
      order by b.created_at desc limit 8`,
  ]);

  return (
    <>
      <PageTitle title="Dashboard" subtitle="Today's operations at a glance" />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Unassigned bookings" value={s.unassigned} href="/admin/bookings?status=requested" highlight={s.unassigned > 0} />
        <Stat label="Pending Safe Pros" value={s.pending_pros} href="/admin/pros?status=pending" highlight={s.pending_pros > 0} />
        <Stat label="Visits today" value={s.today} href="/admin/bookings" />
        <Stat label="In progress now" value={s.in_progress} href="/admin/bookings?status=in_progress" />
        <Stat label="Awaiting acceptance" value={s.awaiting_accept} href="/admin/bookings?status=assigned" />
        <Stat label="Safe Pros online" value={`${s.online_pros} / ${s.approved_pros}`} href="/admin/pros?status=approved" />
        <Stat label="Completed this month" value={s.completed_month} href="/admin/bookings?status=completed" />
        <Stat label="Revenue this month" value={inr(s.revenue_month)} />
        <Stat label="Payouts due" value={inr(s.payouts_due)} />
        <Stat label="Website requests (7 days)" value={s.web_week} href="/admin/bookings" />
      </div>

      <div className="mt-6 grid gap-6 2xl:grid-cols-3">
        <div className="2xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-extrabold text-slate-900">Latest bookings</h2>
            <Link href="/admin/bookings" className="text-sm font-bold text-brand-700">
              View all →
            </Link>
          </div>
          <BookingsTable bookings={recent} />
        </div>

        <Card title="By city">
          <div className="-mx-4 overflow-x-auto sm:-mx-5">
            <table className="table">
              <thead>
                <tr>
                  <th>City</th>
                  <th>Open</th>
                  <th>Done</th>
                  <th>Revenue</th>
                  <th>Pros</th>
                </tr>
              </thead>
              <tbody>
                {cities.map((c) => (
                  <tr key={c.city} className={c.active ? "" : "text-slate-400"}>
                    <td className="font-bold">{c.city}</td>
                    <td>{c.open}</td>
                    <td>{c.completed}</td>
                    <td className="whitespace-nowrap">{inr(c.revenue)}</td>
                    <td>{c.pros}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
