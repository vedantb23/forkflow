// workers/notification.worker.ts — consumes notification-queue jobs.
//
// TODAY: a placeholder that just LOGS what it would send. On Day 6 we add
// Socket.io and this worker will emit a real-time event to the customer's browser
// (room keyed by orderId) so their order status updates live without a refresh.
// Building it now means the full pipeline exists; Day 6 only swaps the body.

import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES } from "../config/constants";
import { bullConnection } from "../queues/connection";
import { logger } from "../config/logger";
import type { NotificationJobData } from "../queues/notification.queue";

async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  const { orderId, userId, status } = job.data;
  // Day 6: io.to(`order:${orderId}`).emit(ORDER_STATUS_UPDATED, { orderId, status })
  logger.info(
    { orderId, userId, status, jobId: job.id },
    "notification.worker: would emit ORDER_STATUS_UPDATED (Socket.io wired Day 6)"
  );
}

export const notificationWorker = new Worker<NotificationJobData>(
  QUEUE_NAMES.NOTIFICATION,
  processNotificationJob,
  {
    connection: bullConnection,
    concurrency: 5,
  }
);

notificationWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "notification.worker: job failed ❌");
});
