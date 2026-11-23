import { findDatabaseEnv, sql } from "@/lib/db";
import { isDemoAadhaar, isDemoOtp } from "@/lib/otp";

export const dynamic = "force-dynamic";

/**
 * Setup check: open /api/health after deploying. Reports what is missing without
 * revealing any secret values or connection details.
 */
export async function GET() {
  const secret = process.env.AUTH_SECRET ?? "";
  const found = findDatabaseEnv();
  // Names only (never values), to spot a database connected under another name or environment.
  const dbLikeNames = Object.keys(process.env)
    .filter((n) => /DATABASE|POSTGRES|^PG|NEON|SUPABASE/i.test(n))
    .sort();
  const checks = {
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    auth_secret: secret.length >= 16 ? "ok" : "missing: set AUTH_SECRET (32+ random characters) in Vercel, then redeploy",
    database: await checkDatabase(Boolean(found)),
    database_variable: found ? found.name : dbLikeNames.length ? `none usable; database-related variables present: ${dbLikeNames.join(", ")}` : "none",
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

async function checkDatabase(configured: boolean): Promise<string> {
  if (!configured) {
    return "missing: connect a Postgres database to this environment (Vercel → Storage → Neon → Connect, tick Production) or set DATABASE_URL, then redeploy";
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
