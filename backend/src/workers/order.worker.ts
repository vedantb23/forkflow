// workers/order.worker.ts — consumes order-queue jobs and runs the fulfilment pipeline.
//
// This is the CONSUMER half of the queue. The API (producer) added a job with
// { orderId }; here we pick it up in a SEPARATE process and do the slow work:
//   payment → status transitions → enqueue email + notification.
//
// KEY PROPERTIES:
//  • Idempotent: if this job already ran (order past PENDING / payment PAID), we
//    skip. BullMQ CAN deliver a job more than once (e.g. worker crashed after
//    doing the work but before ack) — idempotency makes that safe.
//  • Retryable: if we throw, BullMQ retries with exponential backoff (attempts:3
//    from defaultJobOptions). After the last attempt it lands in the "failed" set
//    — that's our DLQ, visible in Bull Board.
//  • Ordered-ish: concurrency:1 processes one order at a time in arrival order,
//    which keeps the demo easy to reason about. (Raise it for throughput later.)

import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES } from "../config/constants";
import { bullConnection } from "../queues/connection";
import { logger } from "../config/logger";
import { query } from "../config/db";
import { processPayment } from "../modules/payments/payment.service";
import { emailQueue, notificationQueue } from "../queues";
import type { OrderJobData } from "../queues/order.queue";

// The actual work for one order job. Exported so it reads clearly; the Worker
// below just wires it to the queue.
async function processOrderJob(job: Job<OrderJobData>): Promise<void> {
  const { orderId } = job.data;
  logger.info({ orderId, jobId: job.id }, "order.worker: processing");

  // Step 1 — load the order. If it's gone, nothing to do (don't retry forever).
  const orders = await query<{ id: string; user_id: string; status: string; total_amount: string }>(
    "SELECT id, user_id, status, total_amount FROM orders WHERE id = $1",
    [orderId]
  );
  if (orders.length === 0) {
    logger.warn({ orderId }, "order.worker: order not found — skipping");
    return; // returning (not throwing) means "done, don't retry"
  }
  const order = orders[0];

  // Step 2 — idempotency: if this order is already past PENDING, a previous run
  // already handled it. Skip so a redelivered job doesn't double-charge/re-email.
  if (order.status !== "PENDING") {
    logger.info({ orderId, status: order.status }, "order.worker: already processed — skipping");
    return;
  }

  // Step 3 — take payment (mock, idempotent on order id).
  const payment = await processPayment(orderId);
  logger.info({ orderId, txn: payment.transaction_id }, "order.worker: payment PAID");

  // Step 4 — advance the order status PENDING → CONFIRMED (payment succeeded).
  // We STOP at CONFIRMED on purpose: the order now rests in the restaurant's
  // Incoming queue and waits for the OWNER to manually accept it (→ PREPARING via
  // PATCH /orders/:id/status). We must NOT auto-advance to PREPARING here, because:
  //   • couriers can only claim orders in PREPARING (see claimDelivery), so
  //     auto-PREPARING makes an order look "ready for pickup" with no human action;
  //   • the owner has to actually see + accept the order first.
  // WHERE guard keeps concurrent/duplicate runs from stomping a later status.
  await query(
    "UPDATE orders SET status = 'CONFIRMED' WHERE id = $1 AND status = 'PENDING'",
    [orderId]
  );
  logger.info({ orderId }, "order.worker: status → CONFIRMED (awaiting owner acceptance)");

  // Step 5 — fan out to the email + notification queues. These run in their own
  // workers, so a slow mail server never blocks order processing.
  await emailQueue.add("order-confirmation", {
    to: `user-${order.user_id}@example.com`, // Day 6 will join users table for the real email
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

// Create the Worker. Passing a processor function makes BullMQ pull jobs and run it.
export const orderWorker = new Worker<OrderJobData>(
  QUEUE_NAMES.ORDER,
  processOrderJob,
  {
    connection: bullConnection,
    concurrency: 1, // one order at a time = arrival order, easy to demo
  }
);

// Lifecycle logs so the terminal clearly shows what the worker is doing.
orderWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "order.worker: job completed ✅");
});
orderWorker.on("failed", (job, err) => {
  // After the final attempt this job sits in the failed set (our DLQ view).
  logger.error({ jobId: job?.id, attemptsMade: job?.attemptsMade, err }, "order.worker: job failed ❌");
});
