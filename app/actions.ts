"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getBookingByRef, insertBooking, logEvent, parseBookingForm } from "@/lib/bookings";
import { sql } from "@/lib/db";
import { checkTrackToken, trackUrl } from "@/lib/track";
import type { FormState } from "@/lib/types";
import { int, normalizePhone, str } from "@/lib/utils";

/** Customer books a service from the public /book page. */
export async function createBooking(_prev: FormState, fd: FormData): Promise<FormState> {
  const parsed = await parseBookingForm(fd, { requireConsent: true, requirePhoneOtp: true });
  if (!parsed.ok) return { error: parsed.error };
  const { ref } = await insertBooking(parsed.data, "web", "Customer");
  redirect(`${trackUrl(ref)}&new=1`);
}

/** Customer looks up a booking with its ID + mobile number. */
export async function findBooking(_prev: FormState, fd: FormData): Promise<FormState> {
  let ref = str(fd, "ref", 20).toUpperCase().replace(/\s+/g, "");
  if (ref && !ref.startsWith("KD-")) ref = `KD-${ref.replace(/^KD/, "")}`;
  const phone = normalizePhone(str(fd, "phone", 20));
  if (!ref || !phone) return { error: "Enter your booking ID and the mobile number used to book." };
  const [row] = await sql<{ ref: string }[]>`select ref from bookings where ref = ${ref} and customer_phone = ${phone}`;
  if (!row) return { error: "We couldn't find a booking with those details." };
  redirect(trackUrl(row.ref));
}

/** Customer rates a completed job. */
export async function submitFeedback(_prev: FormState, fd: FormData): Promise<FormState> {
  const ref = str(fd, "ref", 20);
  if (!checkTrackToken(ref, str(fd, "t", 64))) return { error: "This link has expired. Please look up your booking again." };
  const rating = int(fd, "rating");
  if (!(rating >= 1 && rating <= 5)) return { error: "Please choose a rating from 1 to 5 stars." };
  const feedback = str(fd, "feedback", 1000);
  const booking = await getBookingByRef(ref);
  if (!booking || booking.status !== "completed") return { error: "You can rate a booking once it is completed." };
  if (booking.rating) return { message: "Thanks, your feedback was already recorded." };
  await sql`update bookings set rating = ${rating}, feedback = ${feedback}, updated_at = now() where id = ${booking.id}`;
  await logEvent(booking.id, "Customer", `Rated ${rating}/5${feedback ? `: "${feedback}"` : ""}`);
  revalidatePath(`/track/${booking.ref}`);
  return { message: "Thank you for your feedback!" };
}
