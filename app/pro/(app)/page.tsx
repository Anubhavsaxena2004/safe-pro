import Link from "next/link";
import { OnlineToggle } from "@/app/pro/pro-client";
import { Badge, BookingStatusBadge, Card, EmptyState } from "@/components/ui";
import { requirePro } from "@/lib/auth";
import { sql } from "@/lib/db";
import type { Booking, Pro } from "@/lib/types";
import { dateOnly, firstName, fmtDate, inr, slotLabel, todayIST } from "@/lib/utils";

export default async function ProHomePage() {
  const pro = await requirePro();
  if (pro.status !== "approved") return <StatusNotice pro={pro} />;

  const jobs = await sql<Booking[]>`
    select b.*, s.name as service_name, null as pro_name
    from bookings b join services s on s.id = b.service_id
    where b.pro_id = ${pro.id} and b.status in ('assigned', 'accepted', 'in_progress')
    order by b.preferred_date, array_position(array['morning', 'afternoon', 'evening'], b.preferred_slot)`;

  const today = todayIST();
  const newJobs = jobs.filter((j) => j.status === "assigned");
  const active = jobs.filter((j) => j.status === "in_progress");
  const scheduled = jobs.filter((j) => j.status === "accepted");

  return (
    <div className="space-y-6">
      <OnlineToggle online={pro.is_online} />

      <Section title="New job requests" hint="Accept or decline these jobs." jobs={newJobs} today={today} />
      <Section title="In progress" jobs={active} today={today} />
      <Section title="Scheduled" jobs={scheduled} today={today} />

      {jobs.length === 0 && (
        <EmptyState>
          No jobs right now. Stay online and we&apos;ll assign jobs near you.
          <br />
          <Link href="/pro/earnings" className="mt-2 inline-block font-bold text-brand-700">
            See completed jobs
          </Link>
        </EmptyState>
      )}
    </div>
  );
}

function Section({ title, hint, jobs, today }: { title: string; hint?: string; jobs: Booking[]; today: string }) {
  if (jobs.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-extrabold tracking-wide text-slate-500 uppercase">
        {title} <span className="text-slate-400">({jobs.length})</span>
      </h2>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className="mt-2 space-y-2">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} isToday={dateOnly(job.preferred_date) === today} />
        ))}
      </div>
    </section>
  );
}

function JobCard({ job, isToday }: { job: Booking; isToday: boolean }) {
  return (
    <Link href={`/pro/jobs/${job.id}`} className="card block transition hover:border-brand-500">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-extrabold text-slate-900">{job.service_name}</p>
          <p className="text-sm text-slate-600">
            {fmtDate(job.preferred_date)} · {slotLabel(job.preferred_slot)}
          </p>
          <p className="text-sm text-slate-500">
            {firstName(job.customer_name)} · {job.city} {job.pincode}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <BookingStatusBadge status={job.status} />
          {isToday && <Badge tone="red">Today</Badge>}
          <span className="text-sm font-extrabold text-brand-800">{inr(job.pro_payout)}</span>
        </div>
      </div>
    </Link>
  );
}

function StatusNotice({ pro }: { pro: Pro }) {
  if (pro.status === "pending") {
    return (
      <Card title="Your registration is under review">
        <p className="text-sm text-slate-600">
          Thanks for registering, {firstName(pro.name)}! Our team is checking your ID and details. This usually takes 1–2 working days, and we may
          call you on {pro.phone}.
        </p>
        <p className="mt-3 text-sm text-slate-600">You&apos;ll start getting jobs here as soon as you&apos;re approved.</p>
      </Card>
    );
  }
  return (
    <Card title={pro.status === "rejected" ? "Registration not approved" : "Your account is paused"}>
      <p className="text-sm text-slate-600">
        {pro.status === "rejected"
          ? "Sorry, we couldn't approve your registration right now."
          : "You can't receive new jobs at the moment."}
      </p>
      {pro.status_note && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">{pro.status_note}</p>}
      <p className="mt-3 text-sm text-slate-600">Please contact the Kiddough team if you have questions.</p>
    </Card>
  );
}
