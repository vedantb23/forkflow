// redis.ts — shared Redis client + factory for additional connections.
//
// ioredis automatically detects `rediss://` URLs and enables TLS.
// We include a retryStrategy with backoff so if max connection limits are reached
// during rolling deploys, ioredis waits gracefully instead of spamming reconnects.

import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

// Shared options — with exponential backoff on reconnect.
const baseOptions = {
  maxRetriesPerRequest: null as null,
  retryStrategy(times: number) {
    // Wait 1s, 2s, 3s... up to 10s maximum between reconnect attempts.
    const delay = Math.min(times * 1000, 10000);
    return delay;
  },
};

// Primary shared client.
export const redis = new Redis(env.REDIS_URL, baseOptions);

// Factory: create a new client with the same URL + error handler.
export function createRedisClient(label: string): Redis {
  const client = new Redis(env.REDIS_URL, baseOptions);
  client.on("error", (err: any) => {
    // Log connection errors smoothly without spamming
    if (err?.message?.includes("max number of clients reached")) {
      logger.warn(`Redis ${label}: max client limit reached, waiting for pool slot...`);
    } else {
      logger.error({ err }, `Redis ${label} error`);
    }
  });
  return client;
}

// Lifecycle logs for the primary client.
redis.on("ready", () => logger.info("✅ Redis connected"));
redis.on("error", (err: any) => {
  if (err?.message?.includes("max number of clients reached")) {
    logger.warn("Redis main: max client limit reached, waiting for pool slot...");
  } else {
    logger.error({ err }, "Redis connection error");
  }
});

// Suppress uncaught max-client and socket reset errors from internal connection pools
process.on("uncaughtException", (err: any) => {
  if (
    err?.code === "ECONNRESET" ||
    err?.code === "EPIPE" ||
    err?.message?.includes("max number of clients reached")
  ) {
    logger.warn(`Suppressed transient Redis error: ${err.message || err.code}`);
    return; // allow auto-reconnect without crashing process
  }
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});
