import { sql } from "@/lib/db";
import { isDemoAadhaar, isDemoOtp } from "@/lib/otp";

export const dynamic = "force-dynamic";

/**
 * Setup check: open /api/health after deploying. Reports what is missing without
 * revealing any secret values or connection details.
 */
export async function GET() {
  const secret = process.env.AUTH_SECRET ?? "";
  const checks = {
    auth_secret: secret.length >= 16 ? "ok" : "missing: set AUTH_SECRET (32+ random characters) in Vercel, then redeploy",
    database: await checkDatabase(),
    admin_login:
      process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD
        ? "ok"
        : "ADMIN_EMAIL / ADMIN_PASSWORD not set (only needed until the first admin has logged in)",
    photo_storage: process.env.BLOB_READ_WRITE_TOKEN ? "vercel blob" : "database (no BLOB_READ_WRITE_TOKEN; fine for testing)",
    otp_mode: isDemoOtp() ? "demo (code shown on screen)" : "live",
    aadhaar_mode: isDemoAadhaar() ? "demo (simulated)" : "live",
  };
  const ok = checks.auth_secret === "ok" && checks.database === "ok";
  return Response.json({ ok, ...checks }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}

async function checkDatabase(): Promise<string> {
  if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
    return "missing: connect a Postgres database (Vercel → Storage → Neon) or set DATABASE_URL, then redeploy";
  }
  try {
    const [row] = await sql<{ tables: number }[]>`
      select count(*)::int as tables from information_schema.tables
      where table_schema = current_schema() and table_name in ('pros', 'bookings', 'services', 'otp_requests')`;
    if (row.tables < 4) return "connected, but tables are missing: redeploy (the build creates them) or run npm run db:migrate";
    return "ok";
  } catch (err) {
    const e = err as { code?: string; message?: string };
    const reasons: Record<string, string> = {
      "28P01": "wrong username or password in DATABASE_URL",
      "3D000": "the database name in DATABASE_URL does not exist",
      ENOTFOUND: "database host not found: check DATABASE_URL",
      ECONNREFUSED: "database refused the connection: check host and port",
      ETIMEDOUT: "database connection timed out",
      CONNECT_TIMEOUT: "database connection timed out",
    };
    return `cannot connect: ${reasons[e.code ?? ""] ?? `error ${e.code ?? "unknown"}`}`;
  }
}
