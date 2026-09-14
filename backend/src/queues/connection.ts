import type { ConnectionOptions } from "bullmq";
import { env } from "../config/env";

const url = new URL(env.REDIS_URL);

export const bullConnection: ConnectionOptions = {
  host: url.hostname,
  port: Number(url.port) || 6379,
  username: url.username || undefined,
  password: url.password || undefined,
  tls: url.protocol === "rediss:" ? {} : undefined,
  maxRetriesPerRequest: null,
};

export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};

// Optimizations for Serverless Redis (Upstash) to prevent quota exhaustion
export const defaultWorkerOptions = {
  connection: bullConnection,
  drainDelay: 30000,        // 30s when queue is empty before checking Redis (reduces idle polling 6x)
  stalledInterval: 300000,  // Check stalled jobs every 5 minutes instead of 30s (reduces stalled checks 10x)
  maxStalledCount: 1,
};
