// ─────────────────────────────────────────────────────────────
// redis.ts — the ONE shared Redis client for the whole app.
// WHY one shared client: opening a new connection per request would be slow and
// exhaust connections. We create a single client here and import it everywhere
// (cache, locks, rate-limiting, and BullMQ later all reuse this).
// HOW: `ioredis` speaks Redis's wire protocol over a TCP socket to the Redis
// server running in our Docker container (localhost:6379).
// ─────────────────────────────────────────────────────────────

// Step 1 — imports.
import Redis from "ioredis"; // the Redis client library
import { env } from "./env"; // validated env (REDIS_URL is now required)
import { logger } from "./logger"; // shared logger

// Step 2 — create the client by pointing it at REDIS_URL.
// ioredis opens the connection automatically as soon as the client is created.
export const redis = new Redis(env.REDIS_URL, {
  // maxRetriesPerRequest: null is required by BullMQ (Day 5). It means "keep
  // retrying a command instead of failing fast" — safe for our use, set now so
  // we don't have to reconfigure later.
  maxRetriesPerRequest: null,
});

// Step 3 — listen to connection lifecycle events and log them.
// These fire as the socket changes state, so boot logs clearly show what's up.

// 'ready' = connected AND ready to accept commands. This is the "all good" signal.
redis.on("ready", () => {
  logger.info("✅ Redis connected");
});

// 'error' = something went wrong (server down, wrong URL, network issue).
// We log it but DON'T crash — ioredis will keep trying to reconnect on its own.
redis.on("error", (err) => {
  logger.error({ err }, "Redis connection error");
});

// 'close' = the connection dropped. Useful to see during shutdown/restarts.
redis.on("close", () => {
  logger.warn("Redis connection closed");
});
