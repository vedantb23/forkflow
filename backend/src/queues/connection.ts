// queues/connection.ts — the shared Redis connection settings for BullMQ.
//
// BullMQ requires connection options (ConnectionOptions) to manage its internal pool.
// maxRetriesPerRequest: null is strictly required by BullMQ.

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

// Shared default options for every job we enqueue.
export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential" as const,
    delay: 2000,
  },
  removeOnComplete: true,
  removeOnFail: false,
};
