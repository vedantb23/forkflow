import { logger } from "../config/logger";
import { query } from "../config/db";

let cleanupTimer: NodeJS.Timeout | null = null;

async function runCleanup(): Promise<void> {
  try {
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
  } catch (err) {
    logger.error({ err }, "cleanup.job: failed ❌");
  }
}

export async function startCleanupJob(): Promise<void> {
  // Run once on startup (deferred by 5 seconds to let DB connect)
  setTimeout(() => {
    runCleanup().catch((err) => logger.error({ err }, "Initial cleanup failed"));
  }, 5000);

  // Then run every 30 minutes in-process (0 Redis commands)
  const INTERVAL_MS = 30 * 60 * 1000;
  cleanupTimer = setInterval(runCleanup, INTERVAL_MS);
  logger.info("cleanup.job: scheduled in-process (every 30m, 0 Redis commands)");
}

export const cleanupWorker = {
  close: async (): Promise<void> => {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  },
};

