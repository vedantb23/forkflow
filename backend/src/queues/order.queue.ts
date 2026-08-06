import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../config/constants";
import { bullConnection, defaultJobOptions } from "./connection";

export interface OrderJobData {
  orderId: string;
}

export const orderQueue = new Queue<OrderJobData>(QUEUE_NAMES.ORDER, {
  connection: bullConnection,
  defaultJobOptions,
});
