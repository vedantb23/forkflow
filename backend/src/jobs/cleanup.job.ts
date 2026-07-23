// jobs/cleanup.job.ts — a REPEATABLE background job that runs on a schedule.
//
// CONCEPT: some maintenance work isn't triggered by a request — it just needs to
// happen periodically. BullMQ's "repeatable job" lets us enqueue a job on a cron
// schedule; the cleanupWorker below consumes it each time it fires.
//
// What we clean up:
//  • Stale carts — a cart that's sat untouched for hours is abandoned. We detach
//    it from its restaurant + clear its items so it doesn't hold references.
//
// NOTE: capacity slot holds don't need cleanup here — those Redis keys already
// self-expire via TTL (capacity.service.ts). This job is about DB-side staleness.

import { Queue, Worker, type Job } from "bullmq";
import { bullConnection } from "../queues/connection";
import { logger } from "../config/logger";
import { query } from "../config/db";

const CLEANUP_QUEUE = "cleanup-queue";

// The queue we add the repeatable job to.
const cleanupQueue = new Queue(CLEANUP_QUEUE, { connection: bullConnection });

// startCleanupJob — register the repeatable schedule. Safe to call on every boot:
// BullMQ dedupes a repeatable job by its name + pattern, so we won't stack copies.
export async function startCleanupJob(): Promise<void> { 
  await cleanupQueue.add(
    "expire-stale-carts",
    {},
    {
      repeat: { every: 10 * 60 * 1000 }, // every 10 minutes
      removeOnComplete: true,
      removeOnFail: true,
    }
  );
  logger.info("cleanup.job: repeatable 'expire-stale-carts' scheduled (every 10m)");
}

// The processor: clear carts not updated in the last 2 hours.
async function processCleanupJob(_job: Job): Promise<void> {
  // Delete cart_items for carts older than 2h, then detach those carts from a restaurant.
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

// The worker that runs the cleanup processor each time the repeat fires.
export const cleanupWorker = new Worker(CLEANUP_QUEUE, processCleanupJob, {
  connection: bullConnection,
});

cleanupWorker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err }, "cleanup.job: failed ❌");
});
