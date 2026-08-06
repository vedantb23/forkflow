import { Queue, Worker, type Job } from "bullmq";
import { bullConnection } from "../queues/connection";
import { logger } from "../config/logger";
import { query } from "../config/db";

const CLEANUP_QUEUE = "cleanup-queue";

const cleanupQueue = new Queue(CLEANUP_QUEUE, { connection: bullConnection });

export async function startCleanupJob(): Promise<void> {
  await cleanupQueue.add(
    "expire-stale-carts",
    {},
    {
      repeat: { every: 10 * 60 * 1000 },
      removeOnComplete: true,
      removeOnFail: true,
    }
  );
  logger.info("cleanup.job: repeatable 'expire-stale-carts' scheduled (every 10m)");
}

async function processCleanupJob(_job: Job): Promise<void> {

  const stale = await query<{ id: string }>(
    "SELECT id FROM carts WHERE updated_at < now() - interval '2 hours' AND restaurant_id IS NOT NULL"
  );
  if (stale.length === 0) {
    logger.info("cleanup.job: no stale carts");
    return;
  }
  const ids = stale.map((c) => c.id);
  await query("DELETE FROM cart_items WHERE cart_id = ANY($1)", [ids]);
  await query("UPDATE carts SET restaurant_id = NULL WHERE id = ANY($1)", [ids]);
  logger.info({ count: ids.length }, "cleanup.job: expired stale carts");
}

export const cleanupWorker = new Worker(CLEANUP_QUEUE, processCleanupJob, {
  connection: bullConnection,
});

cleanupWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "cleanup.job: failed ❌");
});
