// seed.ts — fill the DB with sample data so we have something to work with.
// Run with: npm run db:seed
//
// It creates one restaurant-owner user, then 3 restaurants each with a small
// menu. Safe to re-run: it wipes the old seed rows first (by the owner's known
// email) so you don't pile up duplicates.

import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "../src/config/db";
import { logger } from "../src/config/logger";

// A fixed email for our demo owner so we can find + clear old seed data.
const OWNER_EMAIL = "owner@forkflow.dev";

// The sample restaurants and their dishes. Prices in rupees.
const RESTAURANTS = [
  {
    name: "Spice Route",
    cuisine: "North Indian",
    description: "Rich curries and fresh tandoori.",
    maxOrdersPerSlot: 5,
    menu: [
      { name: "Paneer Butter Masala", price: 220, isVeg: true, spice: 2, stock: 20, prep: 20 },
      { name: "Butter Chicken", price: 280, isVeg: false, spice: 2, stock: 15, prep: 25 },
      { name: "Garlic Naan", price: 45, isVeg: true, spice: 0, stock: 50, prep: 10 },
      { name: "Dal Makhani", price: 180, isVeg: true, spice: 1, stock: 25, prep: 20 },
    ],
  },
  {
    name: "Wok & Roll",
    cuisine: "Chinese",
    description: "Indo-Chinese street favourites.",
    maxOrdersPerSlot: 4,
    menu: [
      { name: "Veg Hakka Noodles", price: 150, isVeg: true, spice: 2, stock: 30, prep: 15 },
      { name: "Chilli Chicken", price: 210, isVeg: false, spice: 3, stock: 18, prep: 20 },
      { name: "Veg Manchurian", price: 160, isVeg: true, spice: 2, stock: 22, prep: 18 },
      { name: "Spring Rolls", price: 90, isVeg: true, spice: 1, stock: 40, prep: 12 },
    ],
  },
  {
    name: "Pizza Piazza",
    cuisine: "Italian",
    description: "Wood-fired pizzas and pastas.",
    maxOrdersPerSlot: 6,
    menu: [
      { name: "Margherita Pizza", price: 250, isVeg: true, spice: 0, stock: 20, prep: 20 },
      { name: "Pepperoni Pizza", price: 340, isVeg: false, spice: 1, stock: 12, prep: 22 },
      { name: "Penne Alfredo", price: 230, isVeg: true, spice: 0, stock: 16, prep: 18 },
      { name: "Garlic Bread", price: 120, isVeg: true, spice: 0, stock: 35, prep: 10 },
    ],
  },
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1) wipe old seed data. Deleting the owner cascades to their restaurants,
    //    and deleting a restaurant cascades to its menu items — so this is enough.
    await client.query("DELETE FROM users WHERE email = $1", [OWNER_EMAIL]);

    // 2) create the demo owner. Password is "password123" (hashed).
    const passwordHash = await bcrypt.hash("password123", 10);
    const ownerRows = await client.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, 'RESTAURANT_OWNER')
       RETURNING id`,
      [OWNER_EMAIL, passwordHash, "Demo Owner"]
    );
    const ownerId = ownerRows.rows[0].id;

    // 3) create each restaurant and its menu items.
    for (const r of RESTAURANTS) {
      const restRows = await client.query(
        `INSERT INTO restaurants (name, description, cuisine, max_orders_per_slot, owner_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [r.name, r.description, r.cuisine, r.maxOrdersPerSlot, ownerId]
      );
      const restaurantId = restRows.rows[0].id;

      for (const m of r.menu) {
        await client.query(
          `INSERT INTO menu_items
             (restaurant_id, name, price, is_veg, spice_level, stock, prep_time_minutes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [restaurantId, m.name, m.price, m.isVeg, m.spice, m.stock, m.prep]
        );
      }
      logger.info(`Seeded "${r.name}" with ${r.menu.length} items`);
    }

    await client.query("COMMIT");
    logger.info("✅ Seed complete.");
  } catch (err) {
    await client.query("ROLLBACK"); // undo everything if any step failed
    logger.error({ err }, "❌ Seed failed");
    process.exit(1);
  } finally {
    client.release();
    await pool.end(); // close the pool so the script process can exit
  }
}

seed();
