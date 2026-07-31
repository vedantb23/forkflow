// workers/email.worker.ts — consumes email-queue jobs and sends them via Nodemailer.
//
// Separated from the order worker so a slow/broken mail server only backs up
// EMAILS, never order processing. If a send fails, throwing lets BullMQ retry
// (attempts:3 with backoff); after the last attempt the job sits in the failed
// set for inspection in Bull Board.

import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES } from "../config/constants";
import { bullConnection } from "../queues/connection";
import { logger } from "../config/logger";
import { sendMail } from "../config/mailer";
import type { EmailJobData } from "../queues/email.queue";

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, text } = job.data;
  logger.info({ to, subject, jobId: job.id }, "email.worker: sending");
  // sendMail throws if SMTP isn't configured or the send fails → job retries.
  await sendMail(to, subject, text);
  logger.info({ to, jobId: job.id }, "email.worker: sent ✅");
}

export const emailWorker = new Worker<EmailJobData>(
  QUEUE_NAMES.EMAIL,
  processEmailJob,
  {
    connection: bullConnection,
    concurrency: 5, // emails are independent — send several at once
    drainDelay: 30,
    stalledInterval: 60000,
  }
);

emailWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, attemptsMade: job?.attemptsMade, err }, "email.worker: job failed ❌");
});
