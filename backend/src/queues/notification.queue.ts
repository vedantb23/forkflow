import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../config/constants";
import { bullConnection, defaultJobOptions } from "./connection";

export interface NotificationJobData {
  orderId: string;
  userId: string;
  status: string;
}

export const notificationQueue = new Queue<NotificationJobData>(
  QUEUE_NAMES.NOTIFICATION,
  {
    connection: bullConnection,
    defaultJobOptions,
  }
);
