import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { insertBooking, validateBooking } from "@/lib/bookings";
import { corsHeaders, originAllowed } from "@/lib/cors";
import { sql } from "@/lib/db";
import { appSecret } from "@/lib/secret";
import { slotLabel } from "@/lib/utils";

/**
 * Service requests from the Kiddough Shopify store.
 *
 * POST /api/requests  (JSON)
 *   service          "safety_check" | "installation" | "servicing"   (service codes from Admin → Settings)
 *   customer_name, customer_phone, customer_email?, address, city, pincode
 *   preferred_date   "YYYY-MM-DD", preferred_slot "morning" | "afternoon" | "evening"
 *   notes?, consent: true
 *   product_title?, product_variant?, product_sku?, product_url?, shopify_order?
 *
 * Accepted from browsers on an allowed origin (see lib/cors.ts), or from servers that send
 * the X-Api-Key header matching INTAKE_API_KEY. Nothing is ever written back to Shopify.
 */

const MAX_BODY_BYTES = 20_000;
const MAX_PER_IP_PER_HOUR = 10;
const MAX_PER_PHONE_PER_HOUR = 3;

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  const cors = corsHeaders(origin);
  const reply = (status: number, body: Record<string, unknown>) =>
    Response.json(body, { status, headers: { ...cors, "Cache-Control": "no-store" } });

  if (!apiKeyValid(req.headers.get("x-api-key")) && !originAllowed(origin)) {
    return reply(403, { ok: false, error: "This website is not allowed to send requests." });
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return reply(413, { ok: false, error: "Request is too large." });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(400, { ok: false, error: "Send the request as JSON." });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return reply(400, { ok: false, error: "Send the request as JSON." });
  const raw = body as Record<string, unknown>;
  // Hidden "website" field on the form: real customers leave it empty, spam bots fill it in.
  if (typeof raw.website === "string" && raw.website.trim()) return reply(400, { ok: false, error: "Invalid request." });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const ipHash = createHmac("sha256", appSecret()).update(`ip:${ip}`).digest("hex").slice(0, 32);
  const [{ recent }] = await sql<{ recent: number }[]>`
    select count(*)::int as recent from intake_log where ip_hash = ${ipHash} and created_at > now() - interval '1 hour'`;
  if (recent >= MAX_PER_IP_PER_HOUR) return reply(429, { ok: false, error: "Too many requests. Please try again later or call us." });
  await sql`delete from intake_log where created_at < now() - interval '1 day'`;
  await sql`insert into intake_log (ip_hash) values (${ipHash})`;

  const parsed = await validateBooking(raw, { requireConsent: true });
  if (!parsed.ok) return reply(422, { ok: false, error: parsed.error });

  const [{ same_phone }] = await sql<{ same_phone: number }[]>`
    select count(*)::int as same_phone from bookings
    where customer_phone = ${parsed.data.customer_phone} and source = 'shopify' and created_at > now() - interval '1 hour'`;
  if (same_phone >= MAX_PER_PHONE_PER_HOUR) {
    return reply(429, { ok: false, error: "We already have your recent requests. Our team will call you shortly." });
  }

  const booking = await insertBooking(parsed.data, "shopify", "Customer (website)");
  const [svc] = await sql<{ name: string }[]>`select name from services where id = ${parsed.data.service_id}`;
  return reply(201, {
    ok: true,
    ref: booking.ref,
    completion_code: booking.completion_code,
    service: svc?.name ?? "",
    preferred_date: parsed.data.preferred_date,
    preferred_slot: slotLabel(parsed.data.preferred_slot),
  });
}

function apiKeyValid(given: string | null) {
  const expected = process.env.INTAKE_API_KEY;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
