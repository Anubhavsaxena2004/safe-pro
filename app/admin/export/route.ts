import type { NextRequest } from "next/server";
import { getAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dateOnly, todayIST } from "@/lib/utils";

/** CSV export of bookings for reporting (opens in Excel / Google Sheets). */
export async function GET(req: NextRequest) {
  if (!(await getAdmin())) return new Response("Unauthorized", { status: 401 });
  const status = req.nextUrl.searchParams.get("status") ?? "";
  const city = req.nextUrl.searchParams.get("city") ?? "";

  const rows = await sql`
    select b.ref, b.created_at, b.source, b.status, s.name as service, b.product_title, b.product_variant, b.product_sku,
      b.shopify_order, b.preferred_date, b.preferred_slot,
      b.customer_name, b.customer_phone, b.customer_email, b.address, b.city, b.pincode,
      p.name as safe_pro, b.price, b.pro_payout, b.payout_status, b.checkin_at, b.completed_at, b.pro_notes
    from bookings b join services s on s.id = b.service_id left join pros p on p.id = b.pro_id
    where true
      ${status ? sql`and b.status = ${status}` : sql``}
      ${city ? sql`and b.city = ${city}` : sql``}
    order by b.created_at desc
    limit 10000`;

  const headers = [
    "ref", "created_at", "source", "status", "service", "product_title", "product_variant", "product_sku", "shopify_order",
    "preferred_date", "preferred_slot", "customer_name", "customer_phone", "customer_email", "address", "city", "pincode",
    "safe_pro", "price", "pro_payout", "payout_status", "checkin_at", "completed_at", "pro_notes",
  ];
  const cell = (v: unknown) => {
    if (v == null) return "";
    const s = v instanceof Date ? v.toISOString() : String(v);
    // Quote everything; prefix formula-like values so spreadsheets don't execute them.
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => cell(h === "preferred_date" && r[h] ? dateOnly(r[h]) : r[h])).join(",")),
  ];

  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kiddough-bookings-${todayIST()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
