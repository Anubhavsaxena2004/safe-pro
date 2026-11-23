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

// Same as findDatabaseEnv() in lib/db.ts (keep in sync): DATABASE_URL / POSTGRES_URL, or the
// same names with a custom prefix from Vercel's Storage integrations; pooled URLs first.
function findDatabaseEnv(env) {
  const isPg = (v) => typeof v === "string" && /^postgres(ql)?:\/\//i.test(v.trim());
  for (const name of ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"]) if (isPg(env[name])) return { name, value: env[name] };
  const names = Object.keys(env).sort();
  const pick = (re, exclude) => names.find((n) => re.test(n) && !exclude?.test(n) && isPg(env[n]));
  const name =
    pick(/_(DATABASE_URL|POSTGRES_URL|POSTGRES_PRISMA_URL)$/) ?? // e.g. STORAGE_DATABASE_URL
    pick(/_URL$/, /UNPOOLED|NON_POOLING|NO_SSL/) ?? // Neon "Custom Prefix" + "_URL", e.g. STORAGE_URL
    pick(/UNPOOLED|NON_POOLING/) ??
    pick(/./); // last resort: any variable holding a postgres:// URL
  return name ? { name, value: env[name] } : null;
}

const found = findDatabaseEnv(process.env);
if (!found) {
  console.warn("[migrate] No database connection string found (DATABASE_URL / POSTGRES_URL), skipping database setup.");
  console.warn("[migrate] The app will not work until a database is connected to this environment and you redeploy.");
  process.exit(0);
}
console.log(`[migrate] Using ${found.name}`);

const sql = postgres(cleanDatabaseUrl(found.value), { max: 1, prepare: false, onnotice: () => {} });
try {
  await sql.unsafe(readFileSync(path.join(root, "db", "schema.sql"), "utf8"));
  console.log("[migrate] Database schema is up to date.");
} catch (err) {
  console.error("[migrate] Failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
