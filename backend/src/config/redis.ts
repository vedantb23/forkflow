// ─────────────────────────────────────────────────────────────
// redis.ts — the ONE shared Redis client for the whole app.
//
// Creates a shared client + a factory for creating additional clients
// (needed by Socket.io adapter pub/sub and the notification emitter).
//
// Upstash free tier is sensitive to connection bursts, so we configure
// retryStrategy with exponential backoff and generous timeouts.
// ─────────────────────────────────────────────────────────────

import Redis, { type RedisOptions } from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

// Shared options for every Redis client in the app.
const isCloudRedis = env.REDIS_URL.startsWith("rediss://");

const baseOptions: RedisOptions = {
  maxRetriesPerRequest: null,  // required by BullMQ
  tls: isCloudRedis ? { rejectUnauthorized: false } : undefined,
  connectTimeout: 15000,       // 15s for TLS handshake over the internet
  keepAlive: 30000,            // TCP keep-alive every 30s to prevent idle resets
  enableOfflineQueue: true,    // buffer commands while reconnecting
  retryStrategy(times) {
    // Exponential backoff: 500ms → 1s → 2s → 4s → … capped at 15s.
    // Prevents rapid reconnect loops that burn Upstash free-tier commands.
    const delay = Math.min(times * 500, 15000);
    return delay;
  },
};

// The primary shared client.
export const redis = new Redis(env.REDIS_URL, baseOptions);

// Factory: create a NEW client with the same options + an error handler.
// Use this instead of redis.duplicate() — duplicate() doesn't always
// propagate manually-passed options like tls/keepAlive correctly.
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
// Log close only once, not every reconnect cycle.
let closeLogged = false;
redis.on("close", () => {
  if (!closeLogged) {
    logger.warn("Redis connection closed (will auto-reconnect)");
    closeLogged = true;
  }
});
redis.on("ready", () => { closeLogged = false; });
