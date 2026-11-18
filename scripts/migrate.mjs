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

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!url) {
  console.warn("[migrate] DATABASE_URL is not set, skipping database setup.");
  process.exit(0);
}

const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
try {
  await sql.unsafe(readFileSync(path.join(root, "db", "schema.sql"), "utf8"));
  console.log("[migrate] Database schema is up to date.");
} catch (err) {
  console.error("[migrate] Failed:", err.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
