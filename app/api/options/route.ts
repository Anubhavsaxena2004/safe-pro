import type { NextRequest } from "next/server";
import { corsHeaders } from "@/lib/cors";
import { sql } from "@/lib/db";
import { SLOTS, todayIST } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** GET /api/options: services, cities and time slots for the booking form on the Kiddough store. */
export async function GET(req: NextRequest) {
  const [services, cities] = await Promise.all([
    sql<{ code: string; name: string; description: string; price: number }[]>`
      select code, name, description, price from services where active and code is not null order by sort_order, id`,
    sql<{ name: string }[]>`select name from cities where active order by name`,
  ]);
  return Response.json(
    {
      services,
      cities: cities.map((c) => c.name),
      slots: SLOTS,
      min_date: todayIST(),
      max_date: todayIST(90),
    },
    { headers: { ...corsHeaders(req.headers.get("origin")), "Cache-Control": "public, max-age=60" } },
  );
}

export function OPTIONS(req: NextRequest) {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}
