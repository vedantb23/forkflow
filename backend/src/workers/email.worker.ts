import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES } from "../config/constants";
import { bullConnection } from "../queues/connection";
import { logger } from "../config/logger";
import { sendMail } from "../config/mailer";
import type { EmailJobData } from "../queues/email.queue";

async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to, subject, text } = job.data;
  logger.info({ to, subject, jobId: job.id }, "email.worker: sending");

  await sendMail(to, subject, text);
  logger.info({ to, jobId: job.id }, "email.worker: sent ✅");
}

export const emailWorker = new Worker<EmailJobData>(
  QUEUE_NAMES.EMAIL,
  processEmailJob,
  {
    connection: bullConnection,
    concurrency: 5,
  }
);

emailWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, attemptsMade: job?.attemptsMade, err }, "email.worker: job failed ❌");
});
