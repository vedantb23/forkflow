// queues/email.queue.ts — producer for outgoing emails.
//
// The order worker enqueues an email job after it confirms an order; the email
// worker (workers/email.worker.ts) consumes it and actually sends via Nodemailer.
// Decoupling email into its own queue means a slow/broken mail server never holds
// up order processing — the email just retries on its own schedule.

import { Queue } from "bullmq";
import { QUEUE_NAMES } from "../config/constants";
import { bullConnection, defaultJobOptions } from "./connection";

// Everything the email worker needs to send one message.
export interface EmailJobData {
  to: string; // recipient email
  subject: string; // email subject line
  text: string; // plain-text body (enough for dev/Mailtrap)
}

export const emailQueue = new Queue<EmailJobData>(QUEUE_NAMES.EMAIL, {
  connection: bullConnection,
  defaultJobOptions,
});
