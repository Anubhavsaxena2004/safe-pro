import { get } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { getAdmin, getPro } from "@/lib/auth";
import { sql } from "@/lib/db";
import { blobAccess } from "@/lib/upload";

/**
 * Serves uploaded photos (KYC documents, job photos) only to people allowed to see them:
 * admins, and the Safe Pro who owns the document or the job.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("u");
  if (!url || !/^https:\/\//.test(url)) return new Response("Bad request", { status: 400 });
  if (!(await canView(url))) return new Response("Not found", { status: 404 });

  const result = await get(url, { access: blobAccess() }).catch(() => null);
  if (!result || result.statusCode !== 200) return new Response("Not found", { status: 404 });

  return new Response(result.stream, {
    headers: {
      "Content-Type": result.blob.contentType || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function canView(url: string) {
  if (await getAdmin()) return true;

  const pro = await getPro();
  if (!pro) return false;
  if (pro.id_doc_url === url) return true;
  const [row] = await sql`
    select 1 from booking_photos ph join bookings b on b.id = ph.booking_id
    where ph.url = ${url} and b.pro_id = ${pro.id}`;
  return Boolean(row);
}
