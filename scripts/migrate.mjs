// Creates/updates the database tables. Runs before `next build` (so every Vercel
// deploy keeps the schema current) and can be run by hand: `npm run db:migrate`.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Load .env.local / .env for local runs. Vercel injects env vars itself.
for (const name of [".env.local", ".env"]) {
  const file = path.join(root, name);
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let value = m[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    process.env[m[1]] = value;
  }
}

// Same as cleanDatabaseUrl() in lib/db.ts (keep in sync): drop URL settings postgres.js
// would forward to the server (Neon channel_binding, Supabase supa, pgbouncer) and force
// SSL for remote hosts.
function cleanDatabaseUrl(raw) {
  let url;
  try {
    url = new URL(raw.trim());
  } catch {
    return raw.trim();
  }
  const keep = new Set(["sslmode", "ssl", "sslrootcert", "sslnegotiation", "target_session_attrs", "application_name", "options"]);
  for (const key of [...url.searchParams.keys()]) if (!keep.has(key)) url.searchParams.delete(key);
  const local = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
  if (!local && !url.searchParams.has("sslmode") && !url.searchParams.has("ssl")) url.searchParams.set("sslmode", "require");
  return url.toString();
}

const rawUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!rawUrl) {
  console.warn("[migrate] DATABASE_URL is not set, skipping database setup. The app will not work until it is set and you redeploy.");
  process.exit(0);
}

const sql = postgres(cleanDatabaseUrl(rawUrl), { max: 1, prepare: false, onnotice: () => {} });
try {
  await sql.unsafe(readFileSync(path.join(root, "db", "schema.sql"), "utf8"));
  console.log("[migrate] Database schema is up to date.");
} catch (err) {
  console.error("[migrate] Failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
