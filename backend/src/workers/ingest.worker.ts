import { Worker } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../config/logger";
import { query } from "../config/db";
import { embeddings } from "../modules/search/rag.embeddings";
import type { IngestJobData } from "../queues/ingest.queue";

export const ingestWorker = new Worker<IngestJobData>(
  "ingest",
  async (job) => {
    const { menuItemId } = job.data;
    logger.info(`Starting ingestion for menu item ${menuItemId}`);

    // Fetch item with restaurant name
    const rows = await query<{
      id: string;
      name: string;
      description: string;
      price: string;
      is_veg: boolean;
      spice_level: number;
      restaurant_name: string;
    }>(
      `SELECT m.id, m.name, m.description, m.price, m.is_veg, m.spice_level, r.name as restaurant_name
       FROM menu_items m
       JOIN restaurants r ON m.restaurant_id = r.id
       WHERE m.id = $1`,
      [menuItemId]
    );

    if (rows.length === 0) {
      logger.warn(`Ingest worker: Menu item ${menuItemId} not found.`);
      return;
    }

    const item = rows[0];

    const vegText = item.is_veg ? "Vegetarian" : "Non-Vegetarian";
    const spiceLevels = ["Not Spicy", "Mild", "Medium", "Hot"];
    const spiceText = spiceLevels[item.spice_level] || "Not Spicy";
    
    const textBlob = `
      Dish Name: ${item.name}
      Restaurant: ${item.restaurant_name}
      Description: ${item.description || "No description"}
      Diet: ${vegText}
      Spice Level: ${spiceText}
      Price: ₹${item.price}
    `;

    // Embed
    const [vector] = await embeddings.embedDocuments([textBlob]);
    const vectorString = `[${vector.join(",")}]`;

    // Save to DB
    await query("UPDATE menu_items SET embedding = $1 WHERE id = $2", [vectorString, menuItemId]);
    logger.info(`✅ Generated and saved embedding for dish: ${item.name}`);
  },
  { connection: redis as any }
);

ingestWorker.on("failed", (job, err) => {
  logger.error({ err }, `❌ Ingest job ${job?.id} failed`);
});
