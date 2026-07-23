// queues/notification.queue.ts — producer for real-time notifications.
//
// Today the notification worker just logs "would emit ...". On Day 6 it will push
// the event over Socket.io so the customer's browser updates live without a
// refresh. We build the queue now so the pipeline is complete and Day 6 only has
// to swap the worker's body.

import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../config/constants";
import { bullConnection, defaultJobOptions } from "./connection";

// A status-change event for one order. On Day 6 the frontend subscribes to a
// room keyed by orderId and receives these.
export interface NotificationJobData {
  orderId: string;
  userId: string; // who to notify
  status: string; // the new order status (e.g. "PREPARING")
}

export const notificationQueue = new Queue<NotificationJobData>(
  QUEUE_NAMES.NOTIFICATION,
  {
    connection: bullConnection,
    defaultJobOptions,
  }
);
