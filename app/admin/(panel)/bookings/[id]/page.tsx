import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { assignBooking, autoAssign, cancelBooking, markPayoutPaid } from "@/app/admin/actions";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, BookingStatusBadge, Card, InfoList, PageTitle, PhotoGrid } from "@/components/ui";
import { getBooking, getEvents, getPhotos } from "@/lib/bookings";
import { sql } from "@/lib/db";
import { fileSrc } from "@/lib/upload";
import { fmtDate, fmtDateTime, inr, mapsPointUrl, mapsSearchUrl, slotLabel } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  shopify: "from the Kiddough website",
  admin: "entered by admin",
  web: "online (old booking page)",
};

export const metadata: Metadata = { title: "Booking" };

export default async function AdminBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const b = await getBooking(Number((await params).id));
  if (!b) notFound();

  const [photos, events, pros] = await Promise.all([
    getPhotos(b.id),
    getEvents(b.id),
    sql<{ id: number; name: string; city: string; pincode: string; is_online: boolean; active_jobs: number }[]>`
      select p.id, p.name, p.city, p.pincode, p.is_online,
        (select count(*)::int from bookings x where x.pro_id = p.id and x.status in ('assigned', 'accepted', 'in_progress')) as active_jobs
      from pros p where p.status = 'approved'
      order by (lower(p.city) = lower(${b.city})) desc, (p.pincode = ${b.pincode}) desc, p.name`,
  ]);

  const open = b.status === "requested" || b.status === "assigned" || b.status === "accepted";
  const fullAddress = `${b.address}, ${b.city} ${b.pincode}`;
  const checkinMap = mapsPointUrl(b.checkin_lat, b.checkin_lng);
  const checkoutMap = mapsPointUrl(b.checkout_lat, b.checkout_lng);

  return (
    <>
      <Link href="/admin/bookings" className="text-sm font-bold text-brand-700">
        ← Bookings
      </Link>
      <PageTitle
        title={
          <span className="flex flex-wrap items-center gap-3">
            {b.ref} <BookingStatusBadge status={b.status} />
          </span>
        }
        subtitle={`Created ${fmtDateTime(b.created_at)} · ${SOURCE_LABEL[b.source] ?? b.source}`}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Customer">
            <InfoList
              items={[
                ["Name", b.customer_name],
                [
                  "Phone",
                  <a key="p" href={`tel:+91${b.customer_phone}`} className="font-bold text-brand-700">
                    {b.customer_phone}
                  </a>,
                ],
                ["Email", b.customer_email],
                ["Address", <a key="a" href={mapsSearchUrl(fullAddress)} target="_blank" rel="noreferrer" className="hover:underline">{fullAddress}</a>],
              ]}
            />
          </Card>

          <Card title="Job">
            <InfoList
              items={[
                ["Service", b.service_name],
                [
                  "Product",
                  b.product_title ? (
                    <span key="pr">
                      {b.product_url ? (
                        <a href={b.product_url} target="_blank" rel="noreferrer" className="font-bold text-brand-700 hover:underline">
                          {b.product_title} ↗
                        </a>
                      ) : (
                        b.product_title
                      )}
                      {b.product_variant && <span className="text-slate-500"> · {b.product_variant}</span>}
                      {b.product_sku && <span className="text-slate-500"> · SKU {b.product_sku}</span>}
                    </span>
                  ) : (
                    ""
                  ),
                ],
                ["Shopify order", b.shopify_order ? `#${b.shopify_order}` : ""],
                ["Visit", `${fmtDate(b.preferred_date)}, ${slotLabel(b.preferred_slot)}`],
                ["Customer pays", inr(b.price)],
                ["Safe Pro earns", inr(b.pro_payout)],
                [
                  "Completion code",
                  <span key="c">
                    <span className="font-mono font-bold">{b.completion_code}</span>
                    <span className="block text-xs text-slate-500">Shown to the customer on the website after booking. Read it out if they lose it.</span>
                  </span>,
                ],
                ["Customer notes", b.notes],
              ]}
            />
          </Card>

          <Card title="Field record">
            <InfoList
              items={[
                ["Checked in", b.checkin_at ? <span key="i">{fmtDateTime(b.checkin_at)} {checkinMap ? <a href={checkinMap} target="_blank" rel="noreferrer" className="font-bold text-brand-700">· GPS ↗</a> : <Badge tone="amber">no GPS</Badge>}</span> : "—"],
                ["Completed", b.completed_at ? <span key="o">{fmtDateTime(b.completed_at)} {checkoutMap ? <a href={checkoutMap} target="_blank" rel="noreferrer" className="font-bold text-brand-700">· GPS ↗</a> : <Badge tone="amber">no GPS</Badge>}</span> : "—"],
                ["Work notes", <span key="n" className="whitespace-pre-wrap">{b.pro_notes}</span>],
              ]}
            />
            <div className="mt-4">
              <PhotoGrid photos={photos.map((p) => ({ id: p.id, kind: p.kind, src: fileSrc(p.url) }))} />
            </div>
          </Card>

        </div>

        <div className="space-y-4">
          <Card title="Safe Pro">
            {b.pro_id ? (
              <p className="mb-3 text-sm">
                <Link href={`/admin/pros/${b.pro_id}`} className="font-extrabold text-brand-700 hover:underline">
                  {b.pro_name}
                </Link>
                {b.status === "assigned" && <span className="text-slate-500"> · waiting for them to accept</span>}
              </p>
            ) : (
              <p className="mb-3 text-sm text-slate-500">Not assigned yet.</p>
            )}

            {open && (
              <>
                <ActionForm action={assignBooking} className="space-y-2">
                  <input type="hidden" name="booking_id" value={b.id} />
                  <select name="pro_id" defaultValue={b.pro_id ?? ""} className="input">
                    <option value="">— Unassigned —</option>
                    {pros.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.city} {p.pincode}
                        {p.is_online ? " · online" : ""} · {p.active_jobs} active
                        {b.rejected_by.includes(p.id) ? " · declined" : ""}
                      </option>
                    ))}
                  </select>
                  <SubmitButton className="w-full" pendingText="Saving…">
                    {b.pro_id ? "Reassign" : "Assign"}
                  </SubmitButton>
                </ActionForm>
                {b.status === "requested" && (
                  <ActionForm action={autoAssign} className="mt-2">
                    <input type="hidden" name="booking_id" value={b.id} />
                    <SubmitButton variant="secondary" className="w-full" pendingText="Finding…">
                      Auto-assign best match
                    </SubmitButton>
                  </ActionForm>
                )}
              </>
            )}
          </Card>

          {b.status === "completed" && (
            <Card title="Payout">
              <p className="mb-3 text-sm">
                {inr(b.pro_payout)} to {b.pro_name}{" "}
                <Badge tone={b.payout_status === "paid" ? "green" : "amber"}>{b.payout_status === "paid" ? "Paid" : "Unpaid"}</Badge>
              </p>
              {b.payout_status === "unpaid" && (
                <ActionForm action={markPayoutPaid}>
                  <input type="hidden" name="booking_id" value={b.id} />
                  <SubmitButton variant="secondary" className="w-full" confirm="Mark this payout as paid?">
                    Mark as paid
                  </SubmitButton>
                </ActionForm>
              )}
            </Card>
          )}

          {b.status !== "completed" && b.status !== "cancelled" && (
            <Card title="Cancel booking">
              <ActionForm action={cancelBooking} className="space-y-2">
                <input type="hidden" name="booking_id" value={b.id} />
                <input name="reason" required placeholder="Reason" className="input" />
                <SubmitButton variant="danger" className="w-full" confirm="Cancel this booking?">
                  Cancel booking
                </SubmitButton>
              </ActionForm>
            </Card>
          )}

          <Card title="Timeline">
            <ol className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="text-slate-800">{e.message}</p>
                  <p className="text-xs text-slate-500">
                    {e.actor} · {fmtDateTime(e.created_at)}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
