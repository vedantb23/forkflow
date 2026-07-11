// migrate.ts — create/update all our tables by running schema.sql.
// Run with: npm run db:migrate
//
// We use DIRECT_URL (port 5432) here, not the pooled URL. Schema changes want a
// plain direct connection — the transaction pooler can choke on big DDL scripts.

import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { env } from "../src/config/env";
import { logger } from "../src/config/logger";

async function migrate() {
  // read the SQL file sitting next to this script
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");

  // one-off client on the direct connection (not the shared pool)
  const client = new Client({ connectionString: env.DIRECT_URL });

  try {
    await client.connect();
    logger.info("Running schema.sql...");
    await client.query(sql); // runs the whole file in one go
    logger.info("✅ Migration done — tables are ready.");
  } catch (err) {
    logger.error({ err }, "❌ Migration failed");
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
