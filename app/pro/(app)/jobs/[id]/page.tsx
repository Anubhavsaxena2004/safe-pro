import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AcceptDeclineBar, CheckInBar, CompleteJobForm, JobPhotos, PhotoUploader, ReleaseJobButton } from "@/app/pro/pro-client";
import { IconBox, IconCalendar, IconClock, IconInfo, IconMapPin, IconNavigation, IconNote, IconPhone } from "@/components/icons";
import { Badge, BookingStatusBadge, Card } from "@/components/ui";
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
      <section className="card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold tracking-wide text-slate-500">{b.ref}</p>
            <h1 className="mt-0.5 text-xl leading-tight font-extrabold text-slate-900">{b.service_name}</h1>
          </div>
          <BookingStatusBadge status={b.status} />
        </div>
        <div className="mt-3 space-y-2 text-[15px] text-slate-700">
          <Row icon={<IconCalendar size={18} />}>{fmtDate(b.preferred_date)}</Row>
          <Row icon={<IconClock size={18} />}>{slotLabel(b.preferred_slot)}</Row>
        </div>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-brand-50 px-3.5 py-3">
          <span className="text-sm font-bold text-brand-900">You earn</span>
          <span className="text-xl font-extrabold text-brand-900">{inr(b.pro_payout)}</span>
        </div>
        {b.product_title && (
          <div className="mt-3 flex gap-3 rounded-xl border border-slate-200 p-3">
            <IconBox size={20} className="mt-0.5 shrink-0 text-slate-400" />
            <div className="min-w-0 text-sm">
              <p className="section-title">Product</p>
              <p className="text-[15px] font-extrabold text-slate-900">{b.product_title}</p>
              {(b.product_variant || b.product_sku) && (
                <p className="text-slate-600">{[b.product_variant, b.product_sku && `SKU ${b.product_sku}`].filter(Boolean).join(" · ")}</p>
              )}
              {b.shopify_order && <p className="text-slate-500">Order #{b.shopify_order}</p>}
            </div>
          </div>
        )}
      </section>

      {b.notes && (
        <section className="card flex gap-3 border-amber-200 bg-amber-50 text-amber-900">
          <IconNote size={20} className="mt-0.5 shrink-0" />
          <p className="text-[15px]">
            <span className="font-bold">Customer note: </span>
            {b.notes}
          </p>
        </section>
      )}

      <section className="card">
        <p className="section-title mb-2">Customer</p>
        <p className="text-[17px] font-extrabold text-slate-900">{b.customer_name}</p>
        <div className="mt-1.5 text-[15px] text-slate-600">
          <Row icon={<IconMapPin size={18} />}>{contactVisible ? fullAddress : `${b.city} ${b.pincode}`}</Row>
        </div>
        {contactVisible ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a href={`tel:+91${b.customer_phone}`} className="btn btn-secondary btn-lg">
              <IconPhone size={18} /> Call
            </a>
            <a href={mapsSearchUrl(fullAddress)} target="_blank" rel="noreferrer" className="btn btn-secondary btn-lg">
              <IconNavigation size={18} /> Directions
            </a>
          </div>
        ) : (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
            <IconInfo size={18} className="shrink-0 text-slate-400" />
            Phone number and full address are shown after you accept.
          </p>
        )}
      </section>

      {b.status === "assigned" && <AcceptDeclineBar bookingId={b.id} />}

      {b.status === "accepted" && (
        <>
          <Card title="Visit">
            <p className="text-[15px] text-slate-600">When you reach the customer&apos;s home, tap <b>Check in</b> below. Then add photos and finish the job.</p>
            <div className="mt-2">
              <ReleaseJobButton bookingId={b.id} />
            </div>
          </Card>
          <CheckInBar bookingId={b.id} />
        </>
      )}

      {b.status === "in_progress" && (
        <>
          <Card title="Photos" action={<span className="text-xs font-semibold text-slate-500">Checked in {fmtDateTime(b.checkin_at)}</span>}>
            <p className="mb-3 text-sm text-slate-600">Photograph the products and fittings before and after your work. Please don&apos;t photograph children.</p>
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
          <dl className="divide-y divide-slate-100 text-[15px]">
            <Line label="Checked in">{fmtDateTime(b.checkin_at)}</Line>
            <Line label="Completed">{fmtDateTime(b.completed_at)}</Line>
            <Line label="Payout">
              <span className="flex items-center gap-2">
                {inr(b.pro_payout)}
                <Badge tone={b.payout_status === "paid" ? "green" : "amber"}>{b.payout_status === "paid" ? "Paid" : "Pending"}</Badge>
              </span>
            </Line>
          </dl>
          {b.pro_notes && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-700">{b.pro_notes}</p>}
          <div className="mt-4">
            <JobPhotos photos={photos} canDelete={false} />
          </div>
        </Card>
      )}
    </div>
  );
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <p className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-slate-400">{icon}</span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-semibold text-slate-900">{children}</dd>
    </div>
  );
}
