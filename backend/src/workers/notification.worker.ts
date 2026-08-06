import { Worker, type Job } from "bullmq";
import { Emitter } from "@socket.io/redis-emitter";
import { QUEUE_NAMES } from "../config/constants";
import { bullConnection } from "../queues/connection";
import { redis } from "../config/redis";
import { logger } from "../config/logger";
import { SERVER_EVENTS } from "../realtime/socket.events";
import type { NotificationJobData } from "../queues/notification.queue";

const emitter = new Emitter(redis);

async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  const { orderId, userId, status } = job.data;

  emitter.to(`order:${orderId}`).emit(SERVER_EVENTS.ORDER_STATUS_UPDATED, {
    orderId,
    status,
  });

  logger.info(
    { orderId, userId, status, jobId: job.id },
    "notification.worker: ORDER_STATUS_UPDATED emitted via Redis ✅"
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
