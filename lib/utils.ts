import type { BookingStatus, ProStatus } from "./types";

export const TZ = "Asia/Kolkata";

export const SLOTS = [
  { value: "morning", label: "Morning (9am – 12pm)" },
  { value: "afternoon", label: "Afternoon (12pm – 4pm)" },
  { value: "evening", label: "Evening (4pm – 8pm)" },
] as const;

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  requested: "Requested",
  assigned: "Assigned",
  accepted: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PRO_STATUS_LABEL: Record<ProStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export function slotLabel(value: string) {
  return SLOTS.find((s) => s.value === value)?.label ?? value;
}

/** Compact slot for small screens, e.g. "9am–12pm". */
export function slotShort(value: string) {
  return ({ morning: "9am–12pm", afternoon: "12pm–4pm", evening: "4pm–8pm" } as Record<string, string>)[value] ?? value;
}

/** Short DATE label, e.g. "Thu, 20 Nov". */
export function fmtShortDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d.slice(0, 10) + "T00:00:00Z") : d;
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

export function inr(amount: number | null | undefined) {
  return "₹" + Number(amount ?? 0).toLocaleString("en-IN");
}

/** 'YYYY-MM-DD' for a DATE column value (postgres returns DATE as UTC midnight). */
export function dateOnly(d: Date | string) {
  return typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

/** Display a DATE column value, e.g. "Thu, 20 Nov 2026". */
export function fmtDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d.slice(0, 10) + "T00:00:00Z") : d;
  return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Display a timestamp in India time, e.g. "20 Nov, 3:45 pm". */
export function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: TZ,
  });
}

/** Today's date in India as 'YYYY-MM-DD'. */
export function todayIST(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

/** Normalise an Indian mobile number to 10 digits, or null if invalid. */
export function normalizePhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function mapsPointUrl(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return null;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function mapsSearchUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export function firstName(name: string | null | undefined) {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

/** Read a trimmed string field from FormData. */
export function str(fd: FormData, key: string, max = 500) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function int(fd: FormData, key: string) {
  const n = Number(str(fd, key));
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
