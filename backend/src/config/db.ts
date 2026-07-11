// db.ts — the one shared Postgres connection pool for the whole app.
// We use the `pg` library directly (no ORM). A "pool" keeps a handful of
// connections open and reused, so we don't pay the cost of connecting on every
// query. Import `pool` anywhere you need to hit the DB.

import { Pool } from "pg";
import { env } from "./env";
import { logger } from "./logger";

// DATABASE_URL is the pooled Supabase connection (port 6543) — the right one
// for normal app queries at runtime.
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

// Log if a pooled connection ever errors out in the background.
pool.on("error", (err) => {
  logger.error({ err }, "Postgres pool error");
});

// Small helper so route/service code reads nicely: query(sql, [params]).
// It returns the rows array directly since that's what we want 90% of the time.
export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

// Call once on boot to prove the DB is reachable (like Redis's "connected" log).
export async function connectDb(): Promise<void> {
  const rows = await query<{ now: string }>("SELECT now()");
  logger.info(`✅ Postgres connected (server time: ${rows[0].now})`);
}
