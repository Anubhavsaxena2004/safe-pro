import Link from "next/link";
import type { ReactNode } from "react";
import { OnlineToggle } from "@/app/pro/pro-client";
import { IconCalendar, IconCheck, IconChevronRight, IconClock, IconMapPin, IconWallet } from "@/components/icons";
import { Badge, BookingStatusBadge, Card } from "@/components/ui";
import { requirePro } from "@/lib/auth";
import { sql } from "@/lib/db";
import type { Booking, BookingStatus, Pro } from "@/lib/types";
import { cn, dateOnly, firstName, fmtShortDate, inr, slotShort, todayIST, TZ } from "@/lib/utils";

export default async function ProHomePage() {
  const pro = await requirePro();
  if (pro.status !== "approved") return <StatusNotice pro={pro} />;

  const [jobs, [month]] = await Promise.all([
    sql<Booking[]>`
      select b.*, s.name as service_name, null as pro_name
      from bookings b join services s on s.id = b.service_id
      where b.pro_id = ${pro.id} and b.status in ('assigned', 'accepted', 'in_progress')
      order by b.preferred_date, array_position(array['morning', 'afternoon', 'evening'], b.preferred_slot)`,
    sql<{ earned: number }[]>`
      select coalesce(sum(pro_payout), 0)::int as earned from bookings
      where pro_id = ${pro.id} and status = 'completed'
        and completed_at >= date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata'`,
  ]);

  const today = todayIST();
  const newJobs = jobs.filter((j) => j.status === "assigned");
  const active = jobs.filter((j) => j.status === "in_progress");
  const scheduled = jobs.filter((j) => j.status === "accepted");
  const todayCount = jobs.filter((j) => dateOnly(j.preferred_date) === today).length;

  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hourCycle: "h23", timeZone: TZ }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold text-slate-500">{dateLabel}</p>
        <h1 className="text-[22px] leading-tight font-extrabold text-slate-900">
          {greeting}, {firstName(pro.name)}
        </h1>
      </div>

      <OnlineToggle online={pro.is_online} />

      <div className="grid grid-cols-2 gap-3">
        <MiniStat icon={<IconCalendar size={18} />} label="Today" value={`${todayCount} job${todayCount === 1 ? "" : "s"}`} />
        <MiniStat icon={<IconWallet size={18} />} label="This month" value={inr(month.earned)} href="/pro/earnings" />
      </div>

      <Section title="New job requests" hint="Accept or decline these jobs." jobs={newJobs} today={today} />
      <Section title="In progress" jobs={active} today={today} />
      <Section title="Scheduled" jobs={scheduled} today={today} />

      {jobs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-10 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <IconCalendar size={24} />
          </div>
          <p className="font-extrabold text-slate-900">No jobs right now</p>
          <p className="mt-1 text-sm text-slate-500">Stay online and we&apos;ll assign jobs near you.</p>
          <Link href="/pro/earnings" className="btn btn-ghost mt-3">
            See completed jobs
          </Link>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value, href }: { icon: ReactNode; label: string; value: string; href?: string }) {
  const body = (
    <div className="card flex h-full flex-col gap-1 p-3.5">
      <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
        <span className="text-brand-700">{icon}</span>
        {label}
      </span>
      <span className="text-xl font-extrabold text-slate-900">{value}</span>
    </div>
  );
  return href ? (
    <Link href={href} className="transition active:scale-[0.98]">
      {body}
    </Link>
  ) : (
    body
  );
}

function Section({ title, hint, jobs, today }: { title: string; hint?: string; jobs: Booking[]; today: string }) {
  if (jobs.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="section-title">
          {title} <span className="text-slate-400">· {jobs.length}</span>
        </h2>
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} isToday={dateOnly(job.preferred_date) === today} />
        ))}
      </div>
    </section>
  );
}

const ACCENT: Partial<Record<BookingStatus, string>> = {
  assigned: "bg-sky-500",
  accepted: "bg-indigo-500",
  in_progress: "bg-violet-500",
};

function JobCard({ job, isToday }: { job: Booking; isToday: boolean }) {
  return (
    <Link href={`/pro/jobs/${job.id}`} className="card flex overflow-hidden p-0 transition active:scale-[0.99]">
      <span className={cn("w-1.5 shrink-0", ACCENT[job.status] ?? "bg-slate-300")} aria-hidden />
      <div className="min-w-0 flex-1 py-3.5 pr-3 pl-3.5">
        <div className="flex items-start justify-between gap-3">
          <p className="leading-snug font-extrabold text-slate-900">{job.service_name}</p>
          <span className="shrink-0 font-extrabold text-brand-800">{inr(job.pro_payout)}</span>
        </div>
        <div className="mt-1.5 space-y-1 text-sm text-slate-600">
          <p className="flex items-center gap-2">
            <IconClock size={16} className="shrink-0 text-slate-400" />
            {isToday ? "Today" : fmtShortDate(job.preferred_date)} · {slotShort(job.preferred_slot)}
          </p>
          <p className="flex items-center gap-2">
            <IconMapPin size={16} className="shrink-0 text-slate-400" />
            <span className="truncate">
              {firstName(job.customer_name)} · {job.city} {job.pincode}
            </span>
          </p>
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="flex gap-1.5">
            <BookingStatusBadge status={job.status} />
            {isToday && <Badge tone="red">Today</Badge>}
          </span>
          <IconChevronRight size={20} className="text-slate-400" />
        </div>
      </div>
    </Link>
  );
}

function StatusNotice({ pro }: { pro: Pro }) {
  if (pro.status === "pending") {
    const steps: [string, boolean][] = [
      ["Mobile number verified", true],
      [`Aadhaar verified${pro.kyc_mode === "demo" ? " (demo)" : ""}`, pro.aadhaar_verified],
      ["Aadhaar photo uploaded", Boolean(pro.id_doc_url)],
      ["Document check by the Kiddough team", false],
    ];
    return (
      <div className="space-y-4">
        <div className="card px-5 py-7 text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <IconClock size={28} />
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">Registration under review</h1>
          <p className="mt-2 text-sm text-slate-600">
            Thanks, {firstName(pro.name)}! We&apos;re checking your details. This usually takes 1–2 working days, and we may call you on{" "}
            {pro.phone}.
          </p>
        </div>
        <Card title="Verification steps">
          <ol className="space-y-3">
            {steps.map(([label, done]) => (
              <li key={label} className="flex items-center gap-3 text-[15px]">
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full",
                    done ? "bg-emerald-500 text-white" : "border-2 border-dashed border-slate-300 text-slate-400",
                  )}
                >
                  {done ? <IconCheck size={16} strokeWidth={3} /> : null}
                </span>
                <span className={done ? "font-semibold text-slate-800" : "text-slate-500"}>{label}</span>
              </li>
            ))}
          </ol>
        </Card>
        <p className="px-2 text-center text-sm text-slate-500">You&apos;ll start getting jobs here as soon as you&apos;re approved.</p>
      </div>
    );
  }
  return (
    <div className="card px-5 py-7 text-center">
      <h1 className="text-xl font-extrabold text-slate-900">{pro.status === "rejected" ? "Registration not approved" : "Your account is paused"}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {pro.status === "rejected" ? "Sorry, we couldn't approve your registration right now." : "You can't receive new jobs at the moment."}
      </p>
      {pro.status_note && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-left text-sm text-slate-700">{pro.status_note}</p>}
      <p className="mt-4 text-sm text-slate-500">Please contact the Kiddough team if you have questions.</p>
    </div>
  );
}
