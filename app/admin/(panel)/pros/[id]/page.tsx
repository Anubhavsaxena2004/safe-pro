import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setProStatus } from "@/app/admin/actions";
import { BookingsTable } from "@/app/admin/bookings-table";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, InfoList, PageTitle, ProStatusBadge, Stat } from "@/components/ui";
import { sql } from "@/lib/db";
import type { Booking, Pro } from "@/lib/types";
import { fileSrc } from "@/lib/upload";
import { fmtDateTime, inr, mapsPointUrl } from "@/lib/utils";

export const metadata: Metadata = { title: "Safe Pro" };

export default async function AdminProPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [pro] = await sql<Pro[]>`select * from pros where id = ${id}`;
  if (!pro) notFound();

  const [[stats], jobs] = await Promise.all([
    sql<{ done: number; earned: number; unpaid: number; avg_rating: number | null; declined: number }[]>`
      select
        count(*) filter (where status = 'completed')::int as done,
        coalesce(sum(pro_payout) filter (where status = 'completed'), 0)::int as earned,
        coalesce(sum(pro_payout) filter (where status = 'completed' and payout_status = 'unpaid'), 0)::int as unpaid,
        round(avg(rating), 1)::float8 as avg_rating,
        (select count(*)::int from bookings where ${id} = any (rejected_by)) as declined
      from bookings where pro_id = ${id}`,
    sql<Booking[]>`
      select b.*, s.name as service_name, ${pro.name}::text as pro_name
      from bookings b join services s on s.id = b.service_id
      where b.pro_id = ${id} order by b.preferred_date desc limit 50`,
  ]);
  const map = mapsPointUrl(pro.last_lat, pro.last_lng);

  return (
    <>
      <Link href="/admin/pros" className="text-sm font-bold text-brand-700">
        ← Safe Pros
      </Link>
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-3">
            {pro.name} <ProStatusBadge status={pro.status} />
          </span>
        }
        subtitle={`Registered ${fmtDateTime(pro.created_at)}`}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Jobs completed" value={stats.done} />
        <Stat label="Total earned" value={inr(stats.earned)} />
        <Stat label="Unpaid" value={inr(stats.unpaid)} highlight={stats.unpaid > 0} />
        <Stat label="Rating · declined" value={`${stats.avg_rating ? `★ ${stats.avg_rating}` : "—"} · ${stats.declined}`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Profile">
            <InfoList
              items={[
                ["Mobile", <a key="m" href={`tel:+91${pro.phone}`} className="font-bold text-brand-700">{pro.phone}</a>],
                ["City / pincode", `${pro.city} ${pro.pincode}`],
                ["Address", pro.address],
                ["Experience", `${pro.experience_years} years`],
                ["About", pro.about],
                [
                  "Aadhaar",
                  <span key="id" className="flex flex-wrap items-center gap-2">
                    {pro.id_type ? `${pro.id_type} ending ${pro.id_last4}` : "—"}
                    {pro.aadhaar_verified ? (
                      <Badge tone={pro.kyc_mode === "demo" ? "amber" : "green"}>
                        OTP verified{pro.kyc_mode === "demo" ? " (demo)" : ""} · {fmtDateTime(pro.aadhaar_verified_at)}
                      </Badge>
                    ) : (
                      <Badge tone="red">Not verified</Badge>
                    )}
                  </span>,
                ],
                [
                  "Last location",
                  pro.last_seen_at ? (
                    <span key="l">
                      {fmtDateTime(pro.last_seen_at)}{" "}
                      {map && (
                        <a href={map} target="_blank" rel="noreferrer" className="font-bold text-brand-700">
                          · Open map ↗
                        </a>
                      )}
                    </span>
                  ) : (
                    "Not shared yet"
                  ),
                ],
              ]}
            />
          </Card>

          <Card title="ID document">
            {pro.id_doc_url ? (
              <a href={fileSrc(pro.id_doc_url)} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileSrc(pro.id_doc_url)} alt="ID document" className="max-h-80 rounded-xl border border-slate-200" />
              </a>
            ) : (
              <p className="text-sm text-slate-500">No document uploaded.</p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Check the name, photo and last 4 digits match before approving.
              {pro.kyc_mode === "demo" && " Aadhaar OTP is in demo mode, so this photo check is the real verification for now."}
            </p>
          </Card>
        </div>

        <Card title="Verification">
          {pro.status !== "approved" && (
            <ActionForm action={setProStatus} className="mb-4">
              <input type="hidden" name="pro_id" value={pro.id} />
              <input type="hidden" name="status" value="approved" />
              <SubmitButton className="w-full" pendingText="Approving…">
                Approve Safe Pro
              </SubmitButton>
            </ActionForm>
          )}
          <ActionForm action={setProStatus} className="space-y-2">
            <input type="hidden" name="pro_id" value={pro.id} />
            <label className="label" htmlFor="status">
              Change status
            </label>
            <select id="status" name="status" defaultValue={pro.status} className="input">
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
            </select>
            <textarea name="note" rows={3} defaultValue={pro.status_note} placeholder="Note shown to the Safe Pro (required for reject / suspend)" className="input" />
            <SubmitButton variant="secondary" className="w-full">
              Save status
            </SubmitButton>
          </ActionForm>
        </Card>
      </div>

      <h2 className="mt-6 mb-2 font-extrabold text-slate-900">Jobs</h2>
      <BookingsTable bookings={jobs} />
    </>
  );
}
