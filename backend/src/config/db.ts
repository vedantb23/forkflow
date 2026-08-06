import { Pool } from "pg";
import { env } from "./env";
import { logger } from "./logger";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on("error", (err) => {
  logger.error({ err }, "Postgres pool error");
});

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function connectDb(): Promise<void> {
  const rows = await query<{ now: string }>("SELECT now()");
  logger.info(`✅ Postgres connected (server time: ${rows[0].now})`);
}
