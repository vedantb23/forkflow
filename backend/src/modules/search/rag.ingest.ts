import { pool } from "../../config/db";
import { embeddings } from "./rag.embeddings";
import { logger } from "../../config/logger";

/**
 * rag.ingest.ts
 * Fetches all menu items from the database, generates embeddings for their text
 * descriptions, and stores them in the `embedding` column.
 */
async function ingest() {
  logger.info("Starting RAG ingestion script...");
  
  // 1. Fetch menu items
  const result = await pool.query(`
    SELECT m.id, m.name, m.description, m.price, m.is_veg, m.spice_level, r.name as restaurant_name
    FROM menu_items m
    JOIN restaurants r ON m.restaurant_id = r.id
  `);

  if (result.rows.length === 0) {
    logger.info("No menu items found to ingest.");
    process.exit(0);
  }

  logger.info(`Found ${result.rows.length} items. Generating embeddings...`);

  // 2. Build text representation & generate embeddings
  let count = 0;
  for (const item of result.rows) {
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

    try {
      const [vector] = await embeddings.embedDocuments([textBlob]);
      
      // Update the embedding column in the db
      // pgvector requires formatting the array as '[val1, val2, ...]'
      const vectorString = `[${vector.join(",")}]`;
      
      await pool.query(
        "UPDATE menu_items SET embedding = $1 WHERE id = $2",
        [vectorString, item.id]
      );
      count++;
      logger.info(`Embedded item: ${item.name}`);
    } catch (err) {
      logger.error({ err }, `Failed to embed item ${item.name}`);
    }
  }

  logger.info(`✅ Ingestion complete. Embedded ${count} items.`);
  process.exit(0);
}

if (require.main === module) {
  ingest().catch((err) => {
    console.error("Ingestion error:", err);
    process.exit(1);
  });
}
