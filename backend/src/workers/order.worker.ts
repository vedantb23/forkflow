import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES } from "../config/constants";
import { bullConnection } from "../queues/connection";
import { logger } from "../config/logger";
import { query } from "../config/db";
import { processPayment } from "../modules/payments/payment.service";
import { emailQueue, notificationQueue } from "../queues";
import type { OrderJobData } from "../queues/order.queue";

async function processOrderJob(job: Job<OrderJobData>): Promise<void> {
  const { orderId } = job.data;
  logger.info({ orderId, jobId: job.id }, "order.worker: processing");

  const orders = await query<{ id: string; user_id: string; status: string; total_amount: string; email: string }>(
    `SELECT o.id, o.user_id, o.status, o.total_amount, u.email
     FROM orders o
     JOIN users u ON o.user_id = u.id
     WHERE o.id = $1`,
    [orderId]
  );
  if (orders.length === 0) {
    logger.warn({ orderId }, "order.worker: order not found — skipping");
    return;
  }
  const order = orders[0];

  if (order.status !== "PENDING") {
    logger.info({ orderId, status: order.status }, "order.worker: already processed — skipping");
    return;
  }

  const payment = await processPayment(orderId);
  logger.info({ orderId, txn: payment.transaction_id }, "order.worker: payment PAID");

  await query(
    "UPDATE orders SET status = 'CONFIRMED' WHERE id = $1 AND status = 'PENDING'",
    [orderId]
  );
  logger.info({ orderId }, "order.worker: status → CONFIRMED (awaiting owner acceptance)");

  await emailQueue.add("order-confirmation", {
    to: order.email,
    subject: `Your ForkFlow order is confirmed! 🍽️`,
    text: `Order ${orderId} is confirmed and payment received. The restaurant will start preparing it soon. Total: ₹${order.total_amount}.`,
  });
  await notificationQueue.add("status-changed", {
    orderId,
    userId: order.user_id,
    status: "CONFIRMED",
  });
  logger.info({ orderId }, "order.worker: enqueued email + notification");
}

export const orderWorker = new Worker<OrderJobData>(
  QUEUE_NAMES.ORDER,
  processOrderJob,
  {
    connection: bullConnection,
    concurrency: 1,
  }
);

orderWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "order.worker: job completed ✅");
});
orderWorker.on("failed", (job, err) => {

  logger.error({ jobId: job?.id, attemptsMade: job?.attemptsMade, err }, "order.worker: job failed ❌");
});
