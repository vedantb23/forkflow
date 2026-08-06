import { logger } from "../config/logger";
import { redis } from "../config/redis";

import { orderWorker } from "./order.worker";
import { emailWorker } from "./email.worker";
import { notificationWorker } from "./notification.worker";
import { ingestWorker } from "./ingest.worker";
import { startCleanupJob, cleanupWorker } from "../jobs/cleanup.job";

logger.info("👷 ForkFlow worker process starting...");
logger.info(`   Listening on queues: order, email, notification, ingest, cleanup`);

startCleanupJob().catch((err) => logger.error({ err }, "failed to schedule cleanup job"));

async function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down workers...`);
  await Promise.all([
    orderWorker.close(),
    emailWorker.close(),
    notificationWorker.close(),
    ingestWorker.close(),
    cleanupWorker.close(),
  ]);
  await redis.quit();
  logger.info("Workers + Redis closed. Bye 👋");
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
