// queues/connection.ts — the shared Redis connection settings for BullMQ.
//
// CONCEPT: BullMQ (our job queue) stores jobs IN Redis. Both the producer (the
// API that adds jobs) and the workers (that process them) must talk to the SAME
// Redis. Rather than pass a client around, BullMQ wants connection *options* it
// can use to open its own connections (it opens several internally).
//
// WHY not reuse the `redis` client from config/redis.ts? BullMQ needs to create
// multiple dedicated connections (one blocks on "wait for next job"). Sharing a
// single client would tie those up. So we hand BullMQ the connection OPTIONS and
// let it manage its own pool. We DO reuse the same maxRetriesPerRequest:null
// setting our redis.ts uses — BullMQ requires it.

import type { ConnectionOptions } from "bullmq";
import { env } from "../config/env";

// Parse REDIS_URL (e.g. redis://localhost:6379) into host/port for BullMQ.
// BullMQ accepts a connection URL too, but giving it the parsed pieces plus the
// required option is the most explicit and avoids surprises.
const url = new URL(env.REDIS_URL);

export const bullConnection: ConnectionOptions = {
  host: url.hostname, // e.g. "localhost"
  port: Number(url.port) || 6379, // e.g. 6379
  password: url.password || undefined,
  tls: url.protocol === "rediss:" ? {} : undefined,
  // BullMQ REQUIRES this — it means "never give up on a command", which is the
  // behavior a queue needs (a worker blocking on the next job must not time out).
  maxRetriesPerRequest: null,
};

// Shared default options for every job we enqueue. Centralized so retry/backoff
// policy is consistent across queues (README: config in one place).
export const defaultJobOptions = {
  attempts: 3, // try a failing job up to 3 times total
  backoff: {
    type: "exponential" as const, // wait longer between each retry
    delay: 2000, // 2s, then 4s, then 8s
  },
  removeOnComplete: true, // don't keep successful jobs (Redis stays small)
  removeOnFail: false, // KEEP failed jobs so we can inspect them in Bull Board (our DLQ view)
};
