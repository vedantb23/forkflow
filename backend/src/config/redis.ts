import Redis from "ioredis";
import { env } from "./env";
import { logger } from "./logger";

const baseOptions = {
  maxRetriesPerRequest: null as null,
  retryStrategy(times: number) {

    const delay = Math.min(times * 1000, 10000);
    return delay;
  },
};

export const redis = new Redis(env.REDIS_URL, baseOptions);

export function createRedisClient(label: string): Redis {
  const client = new Redis(env.REDIS_URL, baseOptions);
  client.on("error", (err: any) => {

    if (err?.message?.includes("max number of clients reached")) {
      logger.warn(`Redis ${label}: max client limit reached, waiting for pool slot...`);
    } else {
      logger.error({ err }, `Redis ${label} error`);
    }
  });
  return client;
}

redis.on("ready", () => logger.info("✅ Redis connected"));
redis.on("error", (err: any) => {
  if (err?.message?.includes("max number of clients reached")) {
    logger.warn("Redis main: max client limit reached, waiting for pool slot...");
  } else {
    logger.error({ err }, "Redis connection error");
  }
});

process.on("uncaughtException", (err: any) => {
  if (
    err?.code === "ECONNRESET" ||
    err?.code === "EPIPE" ||
    err?.message?.includes("max number of clients reached")
  ) {
    logger.warn(`Suppressed transient Redis error: ${err.message || err.code}`);
    return;
  }
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});
