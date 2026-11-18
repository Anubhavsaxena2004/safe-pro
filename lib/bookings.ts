import { randomInt } from "node:crypto";
import { sql } from "./db";
import { readProof } from "./otp";
import type { Booking, BookingEvent, BookingPhoto } from "./types";
import { int, normalizePhone, SLOTS, str, todayIST } from "./utils";

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
  phone_verified: boolean;
}

type Parsed = { ok: true; data: BookingInput } | { ok: false; error: string };

const fail = (error: string): Parsed => ({ ok: false, error });

export async function parseBookingForm(fd: FormData, opts: { requireConsent: boolean; requirePhoneOtp: boolean }): Promise<Parsed> {
  const service_id = int(fd, "service_id");
  const customer_name = str(fd, "customer_name", 100);
  // With OTP the verified number arrives as "phone"; staff-entered bookings use "customer_phone".
  const customer_phone = normalizePhone(str(fd, opts.requirePhoneOtp ? "phone" : "customer_phone", 20));
  const customer_email = str(fd, "customer_email", 200).toLowerCase();
  const address = str(fd, "address", 500);
  const city = str(fd, "city", 100);
  const pincode = str(fd, "pincode", 10);
  const preferred_date = str(fd, "preferred_date", 10);
  const preferred_slot = str(fd, "preferred_slot", 20);
  const notes = str(fd, "notes", 1000);

  if (!Number.isInteger(service_id)) return fail("Please choose a service.");
  if (customer_name.length < 2) return fail("Please enter the customer's name.");
  if (opts.requirePhoneOtp) {
    if (!customer_phone || (await readProof(fd.get("phone_token"), "booking")) !== customer_phone) {
      return fail("Please verify your mobile number with the OTP.");
    }
  }
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
  if (opts.requireConsent && fd.get("consent") !== "on") {
    return fail("Please agree to the visit and photo terms to continue.");
  }

  const [service] = await sql`select id from services where id = ${service_id} and active`;
  if (!service) return fail("That service is not available right now.");
  const [cityRow] = await sql`select name from cities where name = ${city} and active`;
  if (!cityRow) return fail("Sorry, we don't serve that city yet.");

  return {
    ok: true,
    data: {
      service_id,
      customer_name,
      customer_phone,
      customer_email,
      address,
      city,
      pincode,
      preferred_date,
      preferred_slot,
      notes,
      phone_verified: opts.requirePhoneOtp,
    },
  };
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

export async function insertBooking(input: BookingInput, source: "web" | "admin", actor: string) {
  const [svc] = await sql<{ price: number; pro_payout: number }[]>`
    select price, pro_payout from services where id = ${input.service_id}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = await sql<{ id: number; ref: string }[]>`
        insert into bookings (
          ref, service_id, customer_name, customer_phone, customer_email, address, city, pincode,
          preferred_date, preferred_slot, notes, source, price, pro_payout, completion_code, phone_verified
        ) values (
          ${genRef()}, ${input.service_id}, ${input.customer_name}, ${input.customer_phone}, ${input.customer_email},
          ${input.address}, ${input.city}, ${input.pincode}, ${input.preferred_date}, ${input.preferred_slot},
          ${input.notes}, ${source}, ${svc.price}, ${svc.pro_payout}, ${genCode()}, ${input.phone_verified}
        ) returning id, ref`;
      await logEvent(row.id, actor, "Booking created");
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

export async function getBookingByRef(ref: string) {
  const [b] = await sql<Booking[]>`
    select b.*, s.name as service_name, p.name as pro_name
    from bookings b
    join services s on s.id = b.service_id
    left join pros p on p.id = b.pro_id
    where b.ref = ${ref.toUpperCase()}`;
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
