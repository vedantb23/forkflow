// redis.ts — shared Redis client + factory for additional connections.
//
// ioredis automatically detects `rediss://` URLs and enables TLS.
// We keep config minimal and let ioredis handle it.

import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

// Shared options — only what's strictly needed.
const baseOptions = { maxRetriesPerRequest: null as null };

// Primary shared client.
export const redis = new Redis(env.REDIS_URL, baseOptions);

// Factory: create a new client with the same URL + error handler.
export function createRedisClient(label: string): Redis {
  const client = new Redis(env.REDIS_URL, baseOptions);
  client.on("error", (err) => {
    logger.error({ err }, `Redis ${label} error`);
  });
  return client;
}

// Lifecycle logs for the primary client.
redis.on("ready", () => logger.info("✅ Redis connected"));
redis.on("error", (err) => logger.error({ err }, "Redis connection error"));

// Catch unhandled errors from BullMQ's internal ioredis connections
// (BullMQ bundles its own ioredis and we can't attach handlers to those).
process.on("uncaughtException", (err: any) => {
  if (err?.code === "ECONNRESET" || err?.code === "EPIPE") {
    logger.warn(`Suppressed ${err.code} from internal Redis connection`);
    return; // don't crash — ioredis will auto-reconnect
  }
  // Re-throw non-Redis errors so they still crash properly.
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});
