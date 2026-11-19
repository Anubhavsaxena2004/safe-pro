import { randomInt } from "node:crypto";
import { sql } from "./db";
import type { Booking, BookingEvent, BookingPhoto } from "./types";
import { normalizePhone, SLOTS, todayIST } from "./utils";

export interface BookingInput {
  service_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  address: string;
  city: string;
  pincode: string;
  preferred_date: string;
  preferred_slot: string;
  notes: string;
  /** Product the job is about, as sent by the Kiddough store (read-only copy). */
  product_title: string;
  product_variant: string;
  product_sku: string;
  product_url: string;
  shopify_order: string;
}

type Parsed = { ok: true; data: BookingInput } | { ok: false; error: string };

const fail = (error: string): Parsed => ({ ok: false, error });

/** Trimmed, length-limited string from untrusted input (form field or JSON value). */
function text(value: unknown, max: number) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, max);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/**
 * Validates a booking from the admin form or from the Kiddough store.
 * The service is given either as `service_id` (admin form) or `service` = service code (store).
 */
export async function validateBooking(raw: Record<string, unknown>, opts: { requireConsent: boolean }): Promise<Parsed> {
  const serviceId = Number(text(raw.service_id, 12));
  const serviceCode = text(raw.service, 40).toLowerCase();
  const customer_name = text(raw.customer_name, 100);
  const customer_phone = normalizePhone(text(raw.customer_phone, 20));
  const customer_email = text(raw.customer_email, 200).toLowerCase();
  const address = text(raw.address, 500);
  const city = text(raw.city, 100);
  const pincode = text(raw.pincode, 10);
  const preferred_date = text(raw.preferred_date, 10);
  const preferred_slot = text(raw.preferred_slot, 20);
  const notes = text(raw.notes, 1000);
  const productUrl = text(raw.product_url, 500);

  if (!Number.isInteger(serviceId) && !serviceCode) return fail("Please choose a service.");
  if (customer_name.length < 2) return fail("Please enter the customer's name.");
  if (!customer_phone) return fail("Please enter a valid 10-digit mobile number.");
  if (customer_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email)) {
    return fail("Please enter a valid email address, or leave it blank.");
  }
  if (address.length < 8) return fail("Please enter the full address.");
  if (!/^\d{6}$/.test(pincode)) return fail("Please enter a valid 6-digit pincode.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferred_date) || preferred_date < todayIST() || preferred_date > todayIST(90)) {
    return fail("Please choose a date between today and the next 90 days.");
  }
  if (!SLOTS.some((s) => s.value === preferred_slot)) return fail("Please choose a time slot.");
  if (opts.requireConsent && !(raw.consent === true || raw.consent === "on" || raw.consent === "true")) {
    return fail("Please agree to the visit and photo terms to continue.");
  }

  const [service] = Number.isInteger(serviceId) && serviceId > 0
    ? await sql<{ id: number }[]>`select id from services where id = ${serviceId} and active`
    : await sql<{ id: number }[]>`select id from services where lower(code) = ${serviceCode} and active`;
  if (!service) return fail("That service is not available right now.");
  const [cityRow] = await sql<{ name: string }[]>`select name from cities where lower(name) = lower(${city}) and active`;
  if (!cityRow) return fail("Sorry, we don't serve that city yet.");

  return {
    ok: true,
    data: {
      service_id: service.id,
      customer_name,
      customer_phone,
      customer_email,
      address,
      city: cityRow.name,
      pincode,
      preferred_date,
      preferred_slot,
      notes,
      product_title: text(raw.product_title, 200),
      product_variant: text(raw.product_variant, 200),
      product_sku: text(raw.product_sku, 100),
      product_url: /^https:\/\/[^\s]+$/.test(productUrl) ? productUrl : "",
      shopify_order: text(raw.shopify_order, 40).replace(/^#/, ""),
    },
  };
}

/** Admin "New booking" form. */
export function parseBookingForm(fd: FormData, opts: { requireConsent: boolean }) {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of fd.entries()) if (typeof value === "string") raw[key] = value;
  return validateBooking(raw, opts);
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function genRef() {
  let s = "KD-";
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[randomInt(REF_ALPHABET.length)];
  return s;
}

function genCode() {
  return String(randomInt(1000, 10000));
}

export async function insertBooking(input: BookingInput, source: "shopify" | "admin", actor: string) {
  const [svc] = await sql<{ price: number; pro_payout: number }[]>`
    select price, pro_payout from services where id = ${input.service_id}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = await sql<{ id: number; ref: string; completion_code: string }[]>`
        insert into bookings (
          ref, service_id, customer_name, customer_phone, customer_email, address, city, pincode,
          preferred_date, preferred_slot, notes, source, price, pro_payout, completion_code,
          product_title, product_variant, product_sku, product_url, shopify_order
        ) values (
          ${genRef()}, ${input.service_id}, ${input.customer_name}, ${input.customer_phone}, ${input.customer_email},
          ${input.address}, ${input.city}, ${input.pincode}, ${input.preferred_date}, ${input.preferred_slot},
          ${input.notes}, ${source}, ${svc.price}, ${svc.pro_payout}, ${genCode()},
          ${input.product_title}, ${input.product_variant}, ${input.product_sku}, ${input.product_url}, ${input.shopify_order}
        ) returning id, ref, completion_code`;
      await logEvent(row.id, actor, source === "shopify" ? "Request received from the Kiddough website" : "Booking created");
      return row;
    } catch (err) {
      if ((err as { code?: string }).code === "23505") continue; // ref collision, try again
      throw err;
    }
  }
  throw new Error("Could not create booking, please try again.");
}

export async function logEvent(bookingId: number, actor: string, message: string) {
  await sql`insert into booking_events (booking_id, actor, message) values (${bookingId}, ${actor}, ${message})`;
}

export async function getBooking(id: number) {
  if (!Number.isInteger(id)) return null;
  const [b] = await sql<Booking[]>`
    select b.*, s.name as service_name, p.name as pro_name
    from bookings b
    join services s on s.id = b.service_id
    left join pros p on p.id = b.pro_id
    where b.id = ${id}`;
  return b ?? null;
}

export function getPhotos(bookingId: number) {
  return sql<BookingPhoto[]>`
    select * from booking_photos where booking_id = ${bookingId} order by (kind = 'after'), created_at`;
}

export function getEvents(bookingId: number) {
  return sql<BookingEvent[]>`select id, actor, message, created_at from booking_events where booking_id = ${bookingId} order by created_at desc`;
}

/**
 * Picks the best approved Safe Pro for a booking: same city, not someone who already
 * rejected it, preferring same pincode, currently online, and the fewest active jobs.
 */
export async function findBestPro(bookingId: number) {
  const [pro] = await sql<{ id: number; name: string }[]>`
    select p.id, p.name
    from pros p, bookings b
    where b.id = ${bookingId}
      and p.status = 'approved'
      and lower(p.city) = lower(b.city)
      and p.id <> all (b.rejected_by)
    order by
      (p.pincode = b.pincode) desc,
      p.is_online desc,
      (select count(*) from bookings x where x.pro_id = p.id and x.status in ('assigned', 'accepted', 'in_progress')) asc,
      p.id asc
    limit 1`;
  return pro ?? null;
}
