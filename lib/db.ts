import postgres from "postgres";

type Sql = postgres.Sql;
const globalForDb = globalThis as unknown as { __kdSql?: Sql };

const URL_PARAMS_TO_KEEP = new Set(["sslmode", "ssl", "sslrootcert", "sslnegotiation", "target_session_attrs", "application_name", "options"]);

/**
 * postgres.js forwards any URL setting it doesn't know to the server, which then refuses
 * to connect ("unrecognized configuration parameter"). Hosted providers add such settings:
 * Neon `channel_binding`, Supabase `supa`, Prisma-style `pgbouncer`. Strip them, and make
 * sure remote databases use SSL. (Same logic in scripts/migrate.mjs; keep them in sync.)
 */
export function cleanDatabaseUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return raw.trim();
  }
  for (const key of [...url.searchParams.keys()]) if (!URL_PARAMS_TO_KEEP.has(key)) url.searchParams.delete(key);
  const local = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(url.hostname);
  if (!local && !url.searchParams.has("sslmode") && !url.searchParams.has("ssl")) url.searchParams.set("sslmode", "require");
  return url.toString();
}

export function databaseUrl() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return raw ? cleanDatabaseUrl(raw) : null;
}

function client(): Sql {
  if (globalForDb.__kdSql) return globalForDb.__kdSql;
  const url = databaseUrl();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env.local (local) or to your Vercel project's Environment Variables.",
    );
  }
  // prepare:false keeps this compatible with pooled connections (Neon / Supabase poolers).
  globalForDb.__kdSql = postgres(url, { max: 5, prepare: false, idle_timeout: 20, connect_timeout: 15 });
  return globalForDb.__kdSql;
}

/**
 * Tagged-template SQL client. The connection is created lazily on first use,
 * so importing this module never fails during `next build`.
 */
export const sql = new Proxy(function () {} as unknown as Sql, {
  apply: (_target, _this, args) => (client() as unknown as (...a: unknown[]) => unknown)(...args),
  get: (_target, prop) => Reflect.get(client(), prop),
}) as Sql;
