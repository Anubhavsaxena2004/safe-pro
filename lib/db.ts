import postgres from "postgres";

type Sql = postgres.Sql;
const globalForDb = globalThis as unknown as { __kdSql?: Sql };

function client(): Sql {
  if (globalForDb.__kdSql) return globalForDb.__kdSql;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
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
