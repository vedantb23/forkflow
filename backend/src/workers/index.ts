// workers/index.ts — the ENTRY POINT for the worker process (`npm run worker`).
//
// This is a SECOND, separate Node process from the API (src/server.ts). It shares
// the same codebase and the same Redis, but runs independently: the API produces
// jobs, this process consumes them. That's the "modular monolith with a separate
// worker" architecture — importing a worker file starts its Worker (they self-register
// with BullMQ on construction), so we just import them all here and keep the process alive.
//
// WHY a separate process? Slow background work (payment, email) must not compete
// with or block fast HTTP request handling. If the worker crashes, the API stays
// up (and vice versa). In production they'd be separate containers.

import { logger } from "../config/logger";
import { redis } from "../config/redis";

// Importing each worker constructs it, which starts it listening on its queue.
import { orderWorker } from "./order.worker";
import { emailWorker } from "./email.worker";
import { notificationWorker } from "./notification.worker";
import { startCleanupJob, cleanupWorker } from "../jobs/cleanup.job";

logger.info("👷 ForkFlow worker process starting...");
logger.info(`   Listening on queues: order, email, notification, cleanup`);

// Register the repeatable cleanup job (expire stale carts / abandoned slot holds).
startCleanupJob().catch((err) => logger.error({ err }, "failed to schedule cleanup job"));

// Graceful shutdown: close every worker (lets in-flight jobs finish) then Redis.
async function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down workers...`);
  await Promise.all([
    orderWorker.close(),
    emailWorker.close(),
    notificationWorker.close(),
    cleanupWorker.close(),
  ]);
  await redis.quit();
  logger.info("Workers + Redis closed. Bye 👋");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
