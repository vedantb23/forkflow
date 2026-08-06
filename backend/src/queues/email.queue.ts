import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../config/constants";
import { bullConnection, defaultJobOptions } from "./connection";

export interface EmailJobData {
  to: string;
  subject: string;
  text: string;
}

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL, {
  connection: bullConnection,
  defaultJobOptions,
});
