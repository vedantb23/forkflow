// queues/order.queue.ts — the producer side of the order-processing pipeline.
//
// A "Queue" object is how we ADD jobs. The matching Worker (workers/order.worker.ts)
// is what CONSUMES them. They connect through Redis using the same queue NAME —
// that string must match exactly on both sides, so it comes from QUEUE_NAMES.

import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../config/constants";
import { bullConnection, defaultJobOptions } from "./connection";

// The shape of the data we put on an order job. Keep it tiny — just the id.
// The worker re-reads the order from the DB (the DB is the source of truth; the
// job payload could be stale by the time it runs).
export interface OrderJobData {
  orderId: string;
}

// Create the queue. Anywhere in the API that wants to enqueue an order job
// imports `orderQueue` and calls orderQueue.add(...).
export const orderQueue = new Queue<OrderJobData>(QUEUE_NAMES.ORDER, {
  connection: bullConnection,
  defaultJobOptions,
});
