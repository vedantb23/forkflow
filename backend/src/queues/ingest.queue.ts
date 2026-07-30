import { Queue } from "bullmq";
import { redis } from "../config/redis";

export interface IngestJobData {
  menuItemId: string;
}

export const ingestQueue = new Queue<IngestJobData>("ingest", {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: true,
  },
});
