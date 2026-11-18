import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { acceptJob, rejectJob } from "@/app/pro/actions";
import { CheckInButton, CompleteJobForm, JobPhotos, PhotoUploader } from "@/app/pro/pro-client";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, BookingStatusBadge, Card, InfoList } from "@/components/ui";
import { requireApprovedPro } from "@/lib/auth";
import { getBooking, getPhotos } from "@/lib/bookings";
import { fileSrc } from "@/lib/upload";
import { fmtDate, fmtDateTime, inr, mapsSearchUrl, slotLabel } from "@/lib/utils";

export const metadata: Metadata = { title: "Job" };

export default async function ProJobPage({ params }: { params: Promise<{ id: string }> }) {
  const pro = await requireApprovedPro();
  const booking = await getBooking(Number((await params).id));
  if (!booking || booking.pro_id !== pro.id) notFound();
  const b = booking;

  const photos = (await getPhotos(b.id)).map((p) => ({ id: p.id, kind: p.kind, src: fileSrc(p.url) }));
  const contactVisible = b.status !== "assigned";
  const fullAddress = `${b.address}, ${b.city} ${b.pincode}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link href="/pro" className="text-sm font-bold text-brand-700">
          ← Jobs
        </Link>
        <span className="text-xs font-bold text-slate-500">{b.ref}</span>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">{b.service_name}</h1>
            <p className="text-sm text-slate-600">
              {fmtDate(b.preferred_date)} · {slotLabel(b.preferred_slot)}
            </p>
          </div>
          <BookingStatusBadge status={b.status} />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2">
          <span className="text-sm font-bold text-brand-900">You earn</span>
          <span className="text-lg font-extrabold text-brand-900">{inr(b.pro_payout)}</span>
        </div>
        {b.notes && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Customer note: {b.notes}</p>}
      </Card>

      <Card title="Customer">
        {contactVisible ? (
          <>
            <InfoList
              items={[
                ["Name", b.customer_name],
                ["Address", fullAddress],
              ]}
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a href={`tel:+91${b.customer_phone}`} className="btn btn-secondary">
                Call customer
              </a>
              <a href={mapsSearchUrl(fullAddress)} target="_blank" rel="noreferrer" className="btn btn-secondary">
                Open in Maps
              </a>
            </div>
          </>
        ) : (
          <>
            <InfoList
              items={[
                ["Name", b.customer_name],
                ["Area", `${b.city} ${b.pincode}`],
              ]}
            />
            <p className="mt-2 text-xs text-slate-500">Phone number and full address are shown after you accept.</p>
          </>
        )}
      </Card>

      {b.status === "assigned" && (
        <Card title="Can you do this job?">
          <ActionForm action={acceptJob}>
            <input type="hidden" name="booking_id" value={b.id} />
            <SubmitButton className="w-full py-3 text-base" pendingText="Accepting…">
              Accept job
            </SubmitButton>
          </ActionForm>
          <DeclineForm bookingId={b.id} />
        </Card>
      )}

      {b.status === "accepted" && (
        <Card title="Visit">
          <CheckInButton bookingId={b.id} />
          <DeclineForm bookingId={b.id} label="Can't make it? Release this job" />
        </Card>
      )}

      {b.status === "in_progress" && (
        <>
          <Card title="Photos" action={<span className="text-xs text-slate-500">Checked in {fmtDateTime(b.checkin_at)}</span>}>
            <p className="mb-3 text-sm text-slate-600">Take photos of the products and fittings before and after your work. Please don&apos;t photograph children.</p>
            <PhotoUploader bookingId={b.id} />
            <div className="mt-4">
              <JobPhotos photos={photos} canDelete />
            </div>
          </Card>
          <Card title="Finish the job">
            <CompleteJobForm bookingId={b.id} />
          </Card>
        </>
      )}

      {b.status === "completed" && (
        <Card title="Completed">
          <InfoList
            items={[
              ["Checked in", fmtDateTime(b.checkin_at)],
              ["Completed", fmtDateTime(b.completed_at)],
              ["Payout", <span key="p">{inr(b.pro_payout)} <Badge tone={b.payout_status === "paid" ? "green" : "amber"}>{b.payout_status === "paid" ? "Paid" : "Pending"}</Badge></span>],
              ["Rating", b.rating ? "★".repeat(b.rating) : "Not rated yet"],
              ["Your notes", b.pro_notes],
            ]}
          />
          <div className="mt-4">
            <JobPhotos photos={photos} canDelete={false} />
          </div>
        </Card>
      )}
    </div>
  );
}

function DeclineForm({ bookingId, label = "Decline this job" }: { bookingId: number; label?: string }) {
  return (
    <details className="mt-4 rounded-xl border border-slate-200 p-3">
      <summary className="cursor-pointer text-sm font-bold text-slate-600">{label}</summary>
      <ActionForm action={rejectJob} className="mt-3 space-y-3">
        <input type="hidden" name="booking_id" value={bookingId} />
        <input name="reason" required placeholder="Reason (e.g. too far, not available that day)" className="input" />
        <SubmitButton variant="danger" pendingText="Sending…" confirm="Give this job back? It will be offered to another Safe Pro.">
          Give job back
        </SubmitButton>
      </ActionForm>
    </details>
  );
}
