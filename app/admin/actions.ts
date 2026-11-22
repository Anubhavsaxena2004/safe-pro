"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, destroySession, requireAdmin } from "@/lib/auth";
import { findBestPro, getBooking, insertBooking, logEvent, parseBookingForm } from "@/lib/bookings";
import { sql } from "@/lib/db";
import { createDemoData, removeDemoData } from "@/lib/demo";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { FormState, ProStatus } from "@/lib/types";
import { int, str } from "@/lib/utils";

const OPEN_STATUSES = ["requested", "assigned", "accepted"];

function refresh() {
  revalidatePath("/admin", "layout");
  revalidatePath("/pro", "layout");
}

// ---------- Auth ----------

export async function loginAdmin(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email", 200).toLowerCase();
  const password = str(fd, "password", 200);
  if (!email || !password) return { error: "Enter your email and password." };

  let [admin] = await sql<{ id: number; password_hash: string }[]>`select id, password_hash from admins where email = ${email}`;
  if (admin) {
    if (!(await verifyPassword(password, admin.password_hash))) return { error: "Wrong email or password." };
  } else {
    // First login: create the admin from ADMIN_EMAIL / ADMIN_PASSWORD, only while no admin exists.
    const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from admins`;
    const envEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    const envPassword = process.env.ADMIN_PASSWORD;
    if (count > 0 || !envEmail || !envPassword || email !== envEmail || password !== envPassword) {
      return { error: count === 0 && !envEmail ? "No admin exists yet. Set ADMIN_EMAIL and ADMIN_PASSWORD, then log in with them." : "Wrong email or password." };
    }
    [admin] = await sql<{ id: number; password_hash: string }[]>`
      insert into admins (email, password_hash) values (${email}, ${await hashPassword(password)})
      on conflict (email) do nothing returning id, password_hash`;
    if (!admin) return { error: "Please try again." };
  }
  await createSession("admin", admin.id);
  redirect("/admin");
}

export async function logoutAdmin() {
  await destroySession("admin");
  redirect("/admin/login");
}

// ---------- Bookings ----------

export async function createBookingAdmin(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = await parseBookingForm(fd, { requireConsent: true });
  if (!parsed.ok) return { error: parsed.error };
  const { id } = await insertBooking(parsed.data, "admin", admin.name);
  refresh();
  redirect(`/admin/bookings/${id}`);
}

export async function assignBooking(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const booking = await getBooking(int(fd, "booking_id"));
  if (!booking) return { error: "Booking not found." };
  if (!OPEN_STATUSES.includes(booking.status)) return { error: "Only open bookings can be assigned." };

  const proField = str(fd, "pro_id");
  if (!proField) {
    if (!booking.pro_id) return { message: "Booking is already unassigned." };
    await sql`update bookings set status = 'requested', pro_id = null, updated_at = now() where id = ${booking.id} and status in ${sql(OPEN_STATUSES)}`;
    await logEvent(booking.id, admin.name, `Unassigned from ${booking.pro_name}`);
    refresh();
    return { message: "Assignment removed." };
  }

  const [pro] = await sql<{ id: number; name: string; status: ProStatus }[]>`select id, name, status from pros where id = ${Number(proField)}`;
  if (!pro || pro.status !== "approved") return { error: "Choose an approved Safe Pro." };
  if (booking.pro_id === pro.id) return { message: `Already assigned to ${pro.name}.` };

  const [row] = await sql`
    update bookings set pro_id = ${pro.id}, status = 'assigned', updated_at = now()
    where id = ${booking.id} and status in ${sql(OPEN_STATUSES)} returning id`;
  if (!row) return { error: "This booking changed in the meantime. Please refresh." };
  await logEvent(booking.id, admin.name, booking.pro_id ? `Reassigned from ${booking.pro_name} to ${pro.name}` : `Assigned to ${pro.name}`);
  refresh();
  return { message: `Assigned to ${pro.name}. They'll see it in their app.` };
}

async function autoAssignOne(bookingId: number, actor: string) {
  const pro = await findBestPro(bookingId);
  if (!pro) return null;
  const [row] = await sql`
    update bookings set pro_id = ${pro.id}, status = 'assigned', updated_at = now()
    where id = ${bookingId} and status = 'requested' returning id`;
  if (!row) return null;
  await logEvent(bookingId, actor, `Auto-assigned to ${pro.name}`);
  return pro;
}

export async function autoAssign(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const booking = await getBooking(int(fd, "booking_id"));
  if (!booking || booking.status !== "requested") return { error: "Only unassigned bookings can be auto-assigned." };
  const pro = await autoAssignOne(booking.id, admin.name);
  if (!pro) return { error: `No approved Safe Pro available in ${booking.city}. Approve one or assign manually.` };
  refresh();
  return { message: `Auto-assigned to ${pro.name}.` };
}

export async function autoAssignAll(_prev: FormState, _fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const open = await sql<{ id: number }[]>`
    select id from bookings where status = 'requested' order by preferred_date, created_at limit 200`;
  let assigned = 0;
  for (const b of open) if (await autoAssignOne(b.id, admin.name)) assigned++;
  refresh();
  const left = open.length - assigned;
  return { message: `Assigned ${assigned} booking${assigned === 1 ? "" : "s"}.${left ? ` ${left} still need a Safe Pro (none available in that city).` : ""}` };
}

export async function cancelBooking(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = int(fd, "booking_id");
  const reason = str(fd, "reason", 300);
  if (!reason) return { error: "Please enter a reason." };
  const [row] = await sql`
    update bookings set status = 'cancelled', updated_at = now()
    where id = ${id} and status not in ('completed', 'cancelled') returning id`;
  if (!row) return { error: "This booking can't be cancelled." };
  await logEvent(id, admin.name, `Cancelled: ${reason}`);
  refresh();
  return { message: "Booking cancelled." };
}

export async function markPayoutPaid(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = int(fd, "booking_id");
  const [row] = await sql`
    update bookings set payout_status = 'paid', updated_at = now()
    where id = ${id} and status = 'completed' and payout_status = 'unpaid' returning id`;
  if (!row) return { error: "Payout is already marked as paid." };
  await logEvent(id, admin.name, "Safe Pro payout marked as paid");
  refresh();
  return { message: "Payout marked as paid." };
}

// ---------- Safe Pros ----------

export async function setProStatus(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(fd, "pro_id");
  const status = str(fd, "status") as ProStatus;
  const note = str(fd, "note", 500);
  if (!["pending", "approved", "rejected", "suspended"].includes(status)) return { error: "Choose a status." };
  if ((status === "rejected" || status === "suspended") && !note) return { error: "Please add a note explaining why. The Safe Pro will see it." };
  const [row] = await sql`
    update pros set status = ${status}, status_note = ${note}, is_online = case when ${status} = 'approved' then is_online else false end
    where id = ${id} returning id`;
  if (!row) return { error: "Safe Pro not found." };
  refresh();
  return { message: status === "approved" ? "Approved. They can now receive jobs." : "Status updated." };
}

// ---------- Settings ----------

export async function saveService(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(fd, "id");
  const name = str(fd, "name", 100);
  const description = str(fd, "description", 500);
  const price = int(fd, "price");
  const payout = int(fd, "pro_payout");
  const sortOrder = int(fd, "sort_order") || 0;
  const active = fd.get("active") === "on";
  const code = str(fd, "code", 40).toLowerCase() || null;
  if (name.length < 2) return { error: "Enter a service name." };
  if (!(price >= 0) || !(payout >= 0)) return { error: "Price and payout must be 0 or more." };
  if (code && !/^[a-z0-9_-]{2,40}$/.test(code)) return { error: "Website code: use lowercase letters, numbers, - or _ (e.g. installation)." };

  try {
    if (Number.isInteger(id) && id > 0) {
      await sql`
        update services set name = ${name}, code = ${code}, description = ${description}, price = ${price}, pro_payout = ${payout},
          sort_order = ${sortOrder}, active = ${active}
        where id = ${id}`;
    } else {
      await sql`
        insert into services (name, code, description, price, pro_payout, sort_order, active)
        values (${name}, ${code}, ${description}, ${price}, ${payout}, ${sortOrder}, true)`;
    }
  } catch (err) {
    if ((err as { code?: string }).code === "23505") return { error: `Another service already uses the website code "${code}".` };
    throw err;
  }
  refresh();
  return { message: "Saved." };
}

// ---------- Demo data ----------

export async function addDemoData(_prev: FormState, _fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const result = await createDemoData(admin.name);
  refresh();
  return { message: `Demo data ready: ${result.pros} Safe Pros and ${result.bookings} bookings.` };
}

export async function clearDemoData(_prev: FormState, _fd: FormData): Promise<FormState> {
  await requireAdmin();
  const result = await removeDemoData();
  refresh();
  return { message: `Removed ${result.bookings} demo bookings and ${result.pros} demo Safe Pros.` };
}

export async function addCity(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(fd, "name", 100).replace(/\s+/g, " ");
  if (name.length < 2) return { error: "Enter a city name." };
  const [row] = await sql`insert into cities (name) values (${name}) on conflict (name) do update set active = true returning id`;
  refresh();
  return row ? { message: `${name} added.` } : { error: "Could not add city." };
}

export async function toggleCity(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  await sql`update cities set active = not active where id = ${int(fd, "id")}`;
  refresh();
  return undefined;
}

export async function addAdmin(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(fd, "name", 100);
  const email = str(fd, "email", 200).toLowerCase();
  const password = str(fd, "password", 200);
  if (name.length < 2) return { error: "Enter a name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const [row] = await sql`
    insert into admins (name, email, password_hash) values (${name}, ${email}, ${await hashPassword(password)})
    on conflict (email) do nothing returning id`;
  if (!row) return { error: "An admin with that email already exists." };
  refresh();
  return { message: `${name} can now log in.` };
}

export async function changeAdminPassword(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const current = str(fd, "current", 200);
  const next = str(fd, "next", 200);
  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  const [row] = await sql<{ password_hash: string }[]>`select password_hash from admins where id = ${admin.id}`;
  if (!row || !(await verifyPassword(current, row.password_hash))) return { error: "Current password is wrong." };
  await sql`update admins set password_hash = ${await hashPassword(next)} where id = ${admin.id}`;
  return { message: "Password changed." };
}
