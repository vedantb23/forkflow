import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { env } from "../src/config/env";
import { logger } from "../src/config/logger";

async function migrate() {

  const sql = readFileSync(join(__dirname, "schema.sql"), "utf8");

  const client = new Client({ connectionString: env.DIRECT_URL });

  try {
    await client.connect();
    logger.info("Running schema.sql...");
    await client.query(sql);
    logger.info("✅ Migration done — tables are ready.");
  } catch (err) {
    logger.error({ err }, "❌ Migration failed");
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
