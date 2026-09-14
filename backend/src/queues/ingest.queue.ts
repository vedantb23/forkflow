import { Queue } from "bullmq";
import { bullConnection, defaultJobOptions } from "./connection";

export interface IngestJobData {
  menuItemId: string;
}

export const ingestQueue = new Queue<IngestJobData>("ingest", {
  connection: bullConnection,
  defaultJobOptions,
});
