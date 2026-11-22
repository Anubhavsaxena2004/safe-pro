import { sql } from "./db";
import { todayIST } from "./utils";

/**
 * Demo data for trying every flow: Safe Pros in each state and bookings in each status.
 * Everything is flagged is_demo so "Remove demo data" deletes exactly these rows.
 * Demo Safe Pros log in like real ones: mobile number, then the OTP shown on screen.
 */

export const DEMO_COMPLETION_CODE = "1234";

const DEMO_PROS = [
  { key: "ravi", name: "Ravi Kumar (Demo)", phone: "9000000001", city: "Mumbai", pincode: "400050", status: "approved", online: true, lat: 19.0596, lng: 72.8295, years: 4, about: "Carpentry, furniture fitting and child-safety installs" },
  { key: "sunita", name: "Sunita Patil (Demo)", phone: "9000000002", city: "Mumbai", pincode: "400076", status: "pending", online: false, lat: null, lng: null, years: 2, about: "Home appliance installation" },
  { key: "arjun", name: "Arjun Mehta (Demo)", phone: "9000000003", city: "Delhi NCR", pincode: "110024", status: "approved", online: false, lat: null, lng: null, years: 6, about: "CCTV and safety equipment installer" },
] as const;

type DemoBooking = {
  ref: string;
  service: "safety_check" | "installation" | "servicing";
  status: "requested" | "assigned" | "accepted" | "completed";
  pro: "ravi" | "arjun" | null;
  day: number; // days from today
  slot: "morning" | "afternoon" | "evening";
  customer: string;
  phone: string;
  address: string;
  city: string;
  pincode: string;
  product?: [title: string, variant: string, sku: string, order: string];
  notes?: string;
  proNotes?: string;
};

// Refs contain 0 and 1, which real refs never use, so they cannot clash with real bookings.
const DEMO_BOOKINGS: DemoBooking[] = [
  { ref: "KD-DEMO01", service: "installation", status: "requested", pro: null, day: 1, slot: "morning", customer: "Priya Sharma (Demo)", phone: "9000001001", address: "Flat 5B, Sea View Apartments, Carter Road, Bandra West", city: "Mumbai", pincode: "400050", product: ["Bed Rail Guard", "Grey", "KD-BR-01", "1042"], notes: "Toddler is 2 years old. 3rd floor, lift available." },
  { ref: "KD-DEMO02", service: "servicing", status: "assigned", pro: "ravi", day: 1, slot: "afternoon", customer: "Neha Iyer (Demo)", phone: "9000001002", address: "12 Palm Grove, Hill Road, Bandra West", city: "Mumbai", pincode: "400050", product: ["Safety Gate", "White · 76–85 cm", "KD-SG-02", "1038"], notes: "Gate latch has become loose." },
  { ref: "KD-DEMO03", service: "installation", status: "accepted", pro: "ravi", day: 0, slot: "evening", customer: "Aman Gupta (Demo)", phone: "9000001003", address: "B-702, Lake View Towers, Powai", city: "Mumbai", pincode: "400076", product: ["Corner Guards (8 pack)", "Clear", "KD-CG-08", "1045"] },
  { ref: "KD-DEMO04", service: "safety_check", status: "completed", pro: "ravi", day: -2, slot: "morning", customer: "Kavya Rao (Demo)", phone: "9000001004", address: "3rd floor, Sunshine Apartments, Linking Road, Khar West", city: "Mumbai", pincode: "400052", notes: "Baby starting to crawl.", proNotes: "Checked 4 rooms. Recommended: 2 safety gates (stairs, kitchen), socket covers x12, corner guards for the glass table, anchor for the bookshelf." },
  { ref: "KD-DEMO05", service: "safety_check", status: "requested", pro: null, day: 2, slot: "morning", customer: "Rohit Verma (Demo)", phone: "9000001005", address: "C-14, Defence Colony", city: "Delhi NCR", pincode: "110024" },
];

function svgDataUrl(svg: string) {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const DEMO_ID_DOC = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><rect width="640" height="400" rx="24" fill="#f1f5f9"/><rect x="24" y="24" width="592" height="64" rx="12" fill="#0f766e"/><text x="48" y="66" font-family="Arial" font-size="28" font-weight="bold" fill="#fff">DEMO ID · NOT A REAL DOCUMENT</text><rect x="48" y="120" width="150" height="190" rx="12" fill="#cbd5e1"/><text x="230" y="170" font-family="Arial" font-size="26" fill="#334155">Name: Demo Safe Pro</text><text x="230" y="215" font-family="Arial" font-size="26" fill="#334155">Aadhaar: XXXX XXXX 0001</text><text x="230" y="260" font-family="Arial" font-size="26" fill="#334155">Kiddough test data</text></svg>`,
);

const DEMO_AFTER_PHOTO = svgDataUrl(
  `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600"><rect width="600" height="600" fill="#ccfbf1"/><rect x="120" y="140" width="360" height="320" rx="16" fill="none" stroke="#0f766e" stroke-width="18"/><line x1="120" y1="300" x2="480" y2="300" stroke="#0f766e" stroke-width="12"/><text x="300" y="540" text-anchor="middle" font-family="Arial" font-size="34" font-weight="bold" fill="#115e59">DEMO PHOTO</text></svg>`,
);

export async function demoStatus() {
  const [row] = await sql<{ pros: number; bookings: number }[]>`
    select (select count(*)::int from pros where is_demo) as pros,
           (select count(*)::int from bookings where is_demo) as bookings`;
  return row;
}

export function listDemoPros() {
  return sql<{ name: string; phone: string; status: string; city: string }[]>`
    select name, phone, status, city from pros where is_demo order by phone`;
}

export async function removeDemoData() {
  // Real bookings an admin assigned to a demo Safe Pro go back to the queue.
  await sql`
    update bookings set
      pro_id = null,
      status = case when status in ('assigned', 'accepted', 'in_progress') then 'requested' else status end,
      updated_at = now()
    where not is_demo and pro_id in (select id from pros where is_demo)`;
  const bookings = await sql`delete from bookings where is_demo returning id`;
  const pros = await sql`delete from pros where is_demo returning id`;
  return { bookings: bookings.length, pros: pros.length };
}

/** Replaces any existing demo data with a fresh set. */
export async function createDemoData(actor: string) {
  await removeDemoData();

  await sql`insert into cities (name) values ('Mumbai'), ('Delhi NCR') on conflict (name) do update set active = true`;

  const services = await sql<{ id: number; code: string | null; price: number; pro_payout: number }[]>`
    select id, code, price, pro_payout from services where active order by sort_order, id`;
  if (services.length === 0) throw new Error("Add at least one active service first.");
  const serviceFor = (code: string) => services.find((s) => s.code === code) ?? services[0];

  const proIds: Record<string, number> = {};
  for (const p of DEMO_PROS) {
    const [row] = await sql<{ id: number }[]>`
      insert into pros (
        name, phone, city, pincode, address, experience_years, about, id_type, id_last4, id_doc_url,
        aadhaar_verified, aadhaar_verified_at, kyc_mode, status, is_online, last_lat, last_lng, last_seen_at, is_demo
      ) values (
        ${p.name}, ${p.phone}, ${p.city}, ${p.pincode}, ${"Demo address, " + p.city}, ${p.years}, ${p.about},
        'Aadhaar', ${p.phone.slice(-4)}, ${DEMO_ID_DOC}, true, now(), 'demo', ${p.status}, ${p.online},
        ${p.lat}, ${p.lng}, ${p.online ? new Date() : null}, true
      )
      on conflict (phone) do nothing
      returning id`;
    if (row) proIds[p.key] = row.id;
  }

  let created = 0;
  for (const b of DEMO_BOOKINGS) {
    const svc = serviceFor(b.service);
    const proId = b.pro ? (proIds[b.pro] ?? null) : null;
    const status = b.status !== "requested" && !proId ? "requested" : b.status;
    const done = status === "completed";
    const [title, variant, sku, order] = b.product ?? ["", "", "", ""];
    const visit = new Date(`${todayIST(b.day)}T10:00:00+05:30`);
    const [row] = await sql<{ id: number }[]>`
      insert into bookings (
        ref, service_id, customer_name, customer_phone, address, city, pincode, preferred_date, preferred_slot, notes,
        source, status, pro_id, price, pro_payout, completion_code, product_title, product_variant, product_sku, shopify_order,
        checkin_at, checkin_lat, checkin_lng, completed_at, checkout_lat, checkout_lng, pro_notes, is_demo
      ) values (
        ${b.ref}, ${svc.id}, ${b.customer}, ${b.phone}, ${b.address}, ${b.city}, ${b.pincode}, ${todayIST(b.day)}, ${b.slot}, ${b.notes ?? ""},
        'shopify', ${status}, ${proId}, ${svc.price}, ${svc.pro_payout}, ${DEMO_COMPLETION_CODE}, ${title}, ${variant}, ${sku}, ${order},
        ${done ? visit : null}, ${done ? 19.0712 : null}, ${done ? 72.8347 : null},
        ${done ? new Date(visit.getTime() + 75 * 60_000) : null}, ${done ? 19.0712 : null}, ${done ? 72.8347 : null},
        ${b.proNotes ?? ""}, true
      )
      returning id`;
    created++;
    const events: [string, string][] = [["Customer (website)", "Demo request received from the Kiddough website"]];
    if (proId) events.push([actor, `Assigned to ${DEMO_PROS.find((p) => p.key === b.pro)?.name}`]);
    if (status === "accepted" || done) events.push(["Safe Pro", "Safe Pro accepted the job"]);
    if (done) events.push(["Safe Pro", "Checked in at the customer's home"], ["Safe Pro", "Job completed and confirmed with the customer's code"]);
    for (const [who, message] of events) {
      await sql`insert into booking_events (booking_id, actor, message) values (${row.id}, ${who}, ${message})`;
    }
    if (done) await sql`insert into booking_photos (booking_id, kind, url) values (${row.id}, 'after', ${DEMO_AFTER_PHOTO})`;
  }

  return { pros: Object.keys(proIds).length, bookings: created };
}
