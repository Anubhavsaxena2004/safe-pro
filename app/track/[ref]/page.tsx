import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { submitFeedback } from "@/app/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import { Card, InfoList, PhotoGrid, StatusSteps } from "@/components/ui";
import { getBookingByRef, getPhotos } from "@/lib/bookings";
import { checkTrackToken } from "@/lib/track";
import { fileSrc } from "@/lib/upload";
import { firstName, fmtDate, fmtDateTime, inr, slotLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your booking", robots: { index: false } };

export default async function TrackPage({
  params,
  searchParams,
}: {
  params: Promise<{ ref: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ref = decodeURIComponent((await params).ref).toUpperCase();
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t : "";

  if (!checkTrackToken(ref, token)) {
    return (
      <Shell>
        <Card title="This link isn't valid">
          <p className="text-sm text-slate-600">Please look up your booking with its ID and your mobile number.</p>
          <Link href="/track" className="btn btn-primary mt-4">
            Look up booking
          </Link>
        </Card>
      </Shell>
    );
  }

  const b = await getBookingByRef(ref);
  if (!b) notFound();
  const photos = b.status === "completed" ? await getPhotos(b.id) : [];
  const showCode = b.status === "assigned" || b.status === "accepted" || b.status === "in_progress";

  return (
    <Shell>
      {sp.new && (
        <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-extrabold">Booking received!</p>
          <p className="mt-1">
            Your booking ID is <b>{b.ref}</b>. Bookmark this page to check its status anytime.
          </p>
        </div>
      )}

      <div className="mb-4">
        <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">Booking ID</p>
        <h1 className="text-2xl font-extrabold text-slate-900">{b.ref}</h1>
      </div>

      <div className="space-y-4">
        <Card title="Status">
          <StatusSteps status={b.status} />
        </Card>

        {showCode && (
          <div className="card border-accent-400 bg-orange-50">
            <p className="text-sm font-bold text-slate-700">Your completion code</p>
            <p className="my-1 text-4xl font-extrabold tracking-[0.3em] text-slate-900">{b.completion_code}</p>
            <p className="text-sm text-slate-600">Share this code with your Safe Pro only after the work is finished to your satisfaction.</p>
          </div>
        )}

        <Card title="Details">
          <InfoList
            items={[
              ["Service", b.service_name],
              ["Date", `${fmtDate(b.preferred_date)}, ${slotLabel(b.preferred_slot)}`],
              ["Address", `${b.address}, ${b.city} ${b.pincode}`],
              ["Safe Pro", b.pro_name ? firstName(b.pro_name) : "Being assigned"],
              ["Price", b.price > 0 ? inr(b.price) : "Free"],
            ]}
          />
        </Card>

        {b.status === "completed" && (
          <>
            <Card title="Visit report">
              <p className="mb-3 text-sm text-slate-600">Completed {fmtDateTime(b.completed_at)}</p>
              {b.pro_notes && <p className="mb-4 rounded-xl bg-slate-50 p-3 text-sm whitespace-pre-wrap text-slate-700">{b.pro_notes}</p>}
              <PhotoGrid photos={photos.map((p) => ({ id: p.id, kind: p.kind, src: fileSrc(p.url, { ref: b.ref, t: token }) }))} />
            </Card>

            <Card title="Rate your Safe Pro">
              {b.rating ? (
                <p className="text-sm text-slate-700">
                  You rated this visit <b>{"★".repeat(b.rating)}</b>. Thank you!
                </p>
              ) : (
                <ActionForm action={submitFeedback} className="space-y-4">
                  <input type="hidden" name="ref" value={b.ref} />
                  <input type="hidden" name="t" value={token} />
                  <div className="stars" role="radiogroup" aria-label="Rating">
                    {[5, 4, 3, 2, 1].map((n) => (
                      <label key={n} title={`${n} star${n > 1 ? "s" : ""}`}>
                        <input type="radio" name="rating" value={n} required className="sr-only" />
                        <span aria-hidden>★</span>
                        <span className="sr-only">{n} stars</span>
                      </label>
                    ))}
                  </div>
                  <textarea name="feedback" rows={3} placeholder="Tell us about your experience (optional)" className="input" />
                  <SubmitButton pendingText="Sending…">Submit feedback</SubmitButton>
                </ActionForm>
              )}
            </Card>
          </>
        )}
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-8">{children}</main>
      <SiteFooter />
    </>
  );
}
