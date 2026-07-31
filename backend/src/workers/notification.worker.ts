// workers/notification.worker.ts — consumes notification-queue jobs and emits
// live Socket.io events to the customer's browser.
//
// ARCHITECTURE — why the redis-emitter (not a direct io import):
// This worker runs in a SEPARATE process from the API (server.ts). The API process
// owns the Socket.io server and all connected browser sockets. We can't import `io`
// here — it would create a second, disconnected Socket.io instance with no clients.
//
// Instead we use @socket.io/redis-emitter: it publishes the emit command to Redis
// Pub/Sub. The API's Socket.io server (which has the @socket.io/redis-adapter
// attached) picks it up from Redis and delivers it to the right browser. One Redis
// hop, zero shared memory between processes. This is also what makes horizontal
// scaling work — any number of API servers all receive the event.

import { Worker, type Job } from "bullmq";
import { Emitter } from "@socket.io/redis-emitter"; // the cross-process emit bridge
import { QUEUE_NAMES } from "../config/constants";
import { bullConnection } from "../queues/connection";
import { redis } from "../config/redis"; // shared ioredis client
import { logger } from "../config/logger";
import { SERVER_EVENTS } from "../realtime/socket.events"; // event name constants
import type { NotificationJobData } from "../queues/notification.queue";

// Step 1 — create the emitter. It needs its own Redis connection (separate from
// BullMQ's connection) because it uses normal Redis commands, not the BullMQ
// blocking-list protocol. We duplicate the shared client so config stays in one place.
const emitter = new Emitter(redis.duplicate());

// Step 2 — the job processor. Called by BullMQ for each notification job.
async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  const { orderId, userId, status } = job.data;

  // Step 3 — emit to the order's room. Any browser that called socket.join(`order:${orderId}`)
  // (via order.handler.ts) will receive this event instantly, no polling, no refresh.
  // The emitter publishes to Redis → the API's redis-adapter delivers to the socket.
  emitter.to(`order:${orderId}`).emit(SERVER_EVENTS.ORDER_STATUS_UPDATED, {
    orderId,
    status,
  });

  logger.info(
    { orderId, userId, status, jobId: job.id },
    "notification.worker: ORDER_STATUS_UPDATED emitted via Redis ✅"
  );
}

// Step 4 — create the BullMQ worker (concurrency:5 = up to 5 notifications in parallel;
// notifications are fast fire-and-forget, no need to serialize them like orders).
export const notificationWorker = new Worker<NotificationJobData>(
  QUEUE_NAMES.NOTIFICATION,
  processNotificationJob,
  {
    connection: bullConnection,
    concurrency: 5,
    drainDelay: 10,
    stalledInterval: 60000,
  }
);

notificationWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "notification.worker: job failed ❌");
});
