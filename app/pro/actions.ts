"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, destroySession, requireApprovedPro } from "@/lib/auth";
import { getBooking, getPhotos, logEvent } from "@/lib/bookings";
import { sql } from "@/lib/db";
import { isDemoAadhaar, readProof } from "@/lib/otp";
import type { FormState } from "@/lib/types";
import { saveImage } from "@/lib/upload";
import { int, normalizePhone, str } from "@/lib/utils";

const MAX_PHOTOS_PER_JOB = 12;

function coord(value: unknown, limit: number) {
  const n = typeof value === "string" && value !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

// ---------- Registration & login ----------

export async function registerPro(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name", 100);
  const phone = normalizePhone(str(fd, "phone", 20));
  const city = str(fd, "city", 100);
  const pincode = str(fd, "pincode", 10);
  const address = str(fd, "address", 500);
  const experience = int(fd, "experience_years");
  const about = str(fd, "about", 1000);

  if (!phone || (await readProof(fd.get("phone_token"), "pro_register")) !== phone) {
    return { error: "Please verify your mobile number with the OTP first." };
  }
  const aadhaarLast4 = await readProof(fd.get("aadhaar_token"), "aadhaar");
  if (!aadhaarLast4) return { error: "Please verify your Aadhaar with the OTP first." };
  if (name.length < 2) return { error: "Please enter your full name." };
  if (!/^\d{6}$/.test(pincode)) return { error: "Please enter a valid 6-digit pincode." };
  if (address.length < 8) return { error: "Please enter your full address." };
  if (!(experience >= 0 && experience <= 50)) return { error: "Please enter your years of experience (0–50)." };
  if (fd.get("consent") !== "on") return { error: "Please confirm your details and agree to verification." };

  const [cityRow] = await sql`select 1 from cities where name = ${city} and active`;
  if (!cityRow) return { error: "Please choose a city from the list." };
  const [existing] = await sql`select 1 from pros where phone = ${phone}`;
  if (existing) return { error: "This mobile number is already registered. Please log in instead." };

  let idDocUrl: string;
  try {
    idDocUrl = await saveImage(fd.get("id_doc"), "kyc");
  } catch (err) {
    return { error: (err as Error).message };
  }

  const [pro] = await sql<{ id: number }[]>`
    insert into pros (
      name, phone, city, pincode, address, experience_years, about,
      id_type, id_last4, id_doc_url, aadhaar_verified, aadhaar_verified_at, kyc_mode
    ) values (
      ${name}, ${phone}, ${city}, ${pincode}, ${address}, ${experience}, ${about},
      'Aadhaar', ${aadhaarLast4}, ${idDocUrl}, true, now(), ${isDemoAadhaar() ? "demo" : "live"}
    )
    on conflict (phone) do nothing
    returning id`;
  if (!pro) return { error: "This mobile number is already registered. Please log in instead." };

  await createSession("pro", pro.id);
  redirect("/pro");
}

// Login is by mobile OTP: see verifyPhoneOtp("pro_login", …) in app/otp-actions.ts.

export async function logoutPro() {
  await destroySession("pro");
  redirect("/pro/login");
}

// ---------- Availability & location ----------

export async function setOnline(online: boolean, lat?: number | null, lng?: number | null): Promise<FormState> {
  const pro = await requireApprovedPro();
  const la = coord(lat, 90);
  const ln = coord(lng, 180);
  await sql`
    update pros set
      is_online = ${online === true},
      last_lat = coalesce(${la}::float8, last_lat),
      last_lng = coalesce(${ln}::float8, last_lng),
      last_seen_at = now()
    where id = ${pro.id}`;
  revalidatePath("/pro", "layout");
  return { message: online ? "You're online." : "You're offline." };
}

export async function pingLocation(lat: number, lng: number): Promise<void> {
  const pro = await requireApprovedPro();
  const la = coord(lat, 90);
  const ln = coord(lng, 180);
  if (la == null || ln == null) return;
  await sql`update pros set last_lat = ${la}, last_lng = ${ln}, last_seen_at = now() where id = ${pro.id}`;
}

// ---------- Job workflow ----------

export async function acceptJob(_prev: FormState, fd: FormData): Promise<FormState> {
  const pro = await requireApprovedPro();
  const id = int(fd, "booking_id");
  const [row] = await sql`
    update bookings set status = 'accepted', updated_at = now()
    where id = ${id} and pro_id = ${pro.id} and status = 'assigned'
    returning id`;
  if (!row) return { error: "This job can no longer be accepted." };
  await logEvent(id, pro.name, "Safe Pro accepted the job");
  revalidatePath("/pro", "layout");
  return { message: "Job accepted. The customer's contact details are now visible." };
}

export async function rejectJob(_prev: FormState, fd: FormData): Promise<FormState> {
  const pro = await requireApprovedPro();
  const id = int(fd, "booking_id");
  const reason = str(fd, "reason", 300);
  if (!reason) return { error: "Please tell us why you can't take this job." };
  const [row] = await sql`
    update bookings set
      status = 'requested', pro_id = null,
      rejected_by = array_append(rejected_by, ${pro.id}::int),
      updated_at = now()
    where id = ${id} and pro_id = ${pro.id} and status in ('assigned', 'accepted')
    returning id`;
  if (!row) return { error: "This job can no longer be declined." };
  await logEvent(id, pro.name, `Safe Pro declined the job: ${reason}`);
  revalidatePath("/pro", "layout");
  redirect("/pro");
}

export async function checkIn(bookingId: number, lat: number | null, lng: number | null): Promise<FormState> {
  const pro = await requireApprovedPro();
  const la = coord(lat, 90);
  const ln = coord(lng, 180);
  const [row] = await sql`
    update bookings set status = 'in_progress', checkin_at = now(), checkin_lat = ${la}, checkin_lng = ${ln}, updated_at = now()
    where id = ${Number(bookingId)} and pro_id = ${pro.id} and status = 'accepted'
    returning id`;
  if (!row) return { error: "You can't check in to this job right now." };
  if (la != null && ln != null) {
    await sql`update pros set last_lat = ${la}, last_lng = ${ln}, last_seen_at = now() where id = ${pro.id}`;
  }
  await logEvent(Number(bookingId), pro.name, la != null ? "Checked in at the customer's home" : "Checked in (location not available)");
  revalidatePath("/pro", "layout");
  return { message: "Checked in." };
}

export async function uploadJobPhoto(fd: FormData): Promise<FormState> {
  const pro = await requireApprovedPro();
  const id = int(fd, "booking_id");
  const kind = str(fd, "kind", 10);
  if (kind !== "before" && kind !== "after") return { error: "Choose before or after." };
  const booking = await getBooking(id);
  if (!booking || booking.pro_id !== pro.id || booking.status !== "in_progress") {
    return { error: "Photos can only be added while the job is in progress." };
  }
  const existing = await getPhotos(id);
  if (existing.length >= MAX_PHOTOS_PER_JOB) return { error: `You can add up to ${MAX_PHOTOS_PER_JOB} photos per job.` };

  let url: string;
  try {
    url = await saveImage(fd.get("photo"), `jobs/${booking.ref}`);
  } catch (err) {
    return { error: (err as Error).message };
  }
  await sql`insert into booking_photos (booking_id, kind, url) values (${id}, ${kind}, ${url})`;
  revalidatePath(`/pro/jobs/${id}`);
  return { message: "Photo added." };
}

export async function deleteJobPhoto(photoId: number): Promise<FormState> {
  const pro = await requireApprovedPro();
  const [row] = await sql<{ booking_id: number }[]>`
    delete from booking_photos ph using bookings b
    where ph.id = ${Number(photoId)} and b.id = ph.booking_id and b.pro_id = ${pro.id} and b.status = 'in_progress'
    returning ph.booking_id`;
  if (!row) return { error: "This photo can't be removed." };
  revalidatePath(`/pro/jobs/${row.booking_id}`);
  return { message: "Photo removed." };
}

export async function completeJob(fd: FormData): Promise<FormState> {
  const pro = await requireApprovedPro();
  const id = int(fd, "booking_id");
  const code = str(fd, "code", 10).replace(/\D/g, "");
  const notes = str(fd, "pro_notes", 2000);
  const la = coord(fd.get("lat"), 90);
  const ln = coord(fd.get("lng"), 180);

  const booking = await getBooking(id);
  if (!booking || booking.pro_id !== pro.id || booking.status !== "in_progress") {
    return { error: "This job can't be completed right now." };
  }
  const photos = await getPhotos(id);
  if (!photos.some((p) => p.kind === "after")) return { error: "Please add at least one 'after' photo first." };
  if (code !== booking.completion_code) return { error: "That code is not correct. Please ask the customer for their 4-digit code." };

  const [row] = await sql`
    update bookings set
      status = 'completed', completed_at = now(), checkout_lat = ${la}, checkout_lng = ${ln},
      pro_notes = ${notes}, updated_at = now()
    where id = ${id} and pro_id = ${pro.id} and status = 'in_progress'
    returning id`;
  if (!row) return { error: "This job can't be completed right now." };
  await logEvent(id, pro.name, "Job completed and confirmed with the customer's code");
  revalidatePath("/pro", "layout");
  return { message: "Job completed. Great work!" };
}
