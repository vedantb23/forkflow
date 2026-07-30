// menu.service.ts — business logic for menu items (dishes) under a restaurant.
//
// Ownership twist vs restaurants: menu_items has NO owner_id column. A dish is
// owned *transitively* — through its restaurant. So every owner-scoped write
// checks ownership by joining back to restaurants.owner_id in the SQL itself:
//   ... WHERE restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = $x)
// If the caller doesn't own the parent restaurant, zero rows change → 404.

import { query } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { ingestQueue } from "../../queues";
import { getCachedMenu, setCachedMenu, invalidateMenu } from "./menu.cache";
import type {
  MenuItemRow,
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "./menu.types";

// Step 1 — public menu for a restaurant, cache-aside. Read-heavy (every diner
// opening a restaurant page hits this), changes rarely → cache it.
// Public callers see only AVAILABLE items; that filtered list is what we cache.
export async function listMenu(restaurantId: string): Promise<MenuItemRow[]> {
  // 1. try the cache first (one key per restaurant: menu:<id>)
  const cached = await getCachedMenu(restaurantId);
  if (cached) return cached;

  // 2. miss → hit the DB (only items the diner can actually order)
  const rows = await query<MenuItemRow>(
    `SELECT * FROM menu_items
     WHERE restaurant_id = $1 AND is_available = true
     ORDER BY created_at DESC`,
    [restaurantId]
  );

  // 3. store for next time (TTL auto-expires it even if invalidation is missed)
  await setCachedMenu(restaurantId, rows);
  return rows;
}

// Step 2 — the owner's FULL menu (includes unavailable/out-of-stock items) for
// their dashboard. Not cached: it's owner-only, low traffic, and must be live.
// Ownership enforced in the WHERE via the restaurants join.
export async function listMenuForOwner(
  restaurantId: string,
  ownerId: string
): Promise<MenuItemRow[]> {
  // guard: the restaurant must exist AND belong to this owner
  await assertOwnsRestaurant(restaurantId, ownerId);
  return query<MenuItemRow>(
    "SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY created_at DESC",
    [restaurantId]
  );
}

// Step 3 — create a dish under a restaurant the caller owns.
export async function createMenuItem(
  restaurantId: string,
  ownerId: string,
  input: CreateMenuItemInput,
  imageUrl?: string // Cloudinary URL if an image was uploaded
): Promise<MenuItemRow> {
  // ownership check first — no point inserting if they don't own the restaurant
  await assertOwnsRestaurant(restaurantId, ownerId);

  const rows = await query<MenuItemRow>(
    `INSERT INTO menu_items
       (restaurant_id, name, description, price, image_url, is_veg, spice_level, stock, prep_time_minutes)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, true), COALESCE($7, 0), COALESCE($8, 0), COALESCE($9, 15))
     RETURNING *`,
    [
      restaurantId,
      input.name,
      input.description ?? null,
      input.price,
      imageUrl ?? null,
      input.is_veg ?? null, // COALESCE falls back to the column default
      input.spice_level ?? null,
      input.stock ?? null,
      input.prep_time_minutes ?? null,
    ]
  );
  await invalidateMenu(restaurantId); // menu changed → bust this restaurant's cache
  
  // Trigger background embedding ingestion
  ingestQueue.add("ingest", { menuItemId: rows[0].id }).catch((err) => {
    // We log but don't fail the request if Redis is temporarily hiccuping
    // logger.error({ err }, "Failed to queue ingest job");
  });
  
  return rows[0];
}

// Step 4 — update a dish, owner-scoped. Same dynamic-SET pattern as restaurants,
// but the WHERE also confirms the item's restaurant is owned by the caller.
export async function updateMenuItem(
  itemId: string,
  ownerId: string,
  input: UpdateMenuItemInput,
  imageUrl?: string
): Promise<MenuItemRow> {
  // build "column = $n" fragments for only the fields that were provided
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  const fields: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    price: input.price,
    is_veg: input.is_veg,
    spice_level: input.spice_level,
    stock: input.stock,
    prep_time_minutes: input.prep_time_minutes,
    is_available: input.is_available,
  };
  for (const [col, val] of Object.entries(fields)) {
    if (val !== undefined) {
      sets.push(`${col} = $${i++}`);
      values.push(val);
    }
  }
  if (imageUrl) {
    sets.push(`image_url = $${i++}`);
    values.push(imageUrl);
  }
  if (sets.length === 0) throw ApiError.badRequest("Nothing to update");

  // WHERE id = $i AND restaurant_id IN (owner's restaurants) — ownership in SQL.
  values.push(itemId, ownerId);
  const rows = await query<MenuItemRow>(
    `UPDATE menu_items SET ${sets.join(", ")}
     WHERE id = $${i}
       AND restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = $${i + 1})
     RETURNING *`,
    values
  );
  if (rows.length === 0) {
    // doesn't exist, or the caller doesn't own its restaurant — same answer
    throw ApiError.notFound("Menu item not found (or you don't own it)");
  }
  await invalidateMenu(rows[0].restaurant_id);
  
  // Trigger background embedding ingestion (since name, description, price, etc might have changed)
  ingestQueue.add("ingest", { menuItemId: rows[0].id }).catch(() => {});
  
  return rows[0];
}

// Step 5 — delete a dish, owner-scoped (same ownership subquery).
export async function deleteMenuItem(itemId: string, ownerId: string): Promise<void> {
  const rows = await query<MenuItemRow>(
    `DELETE FROM menu_items
     WHERE id = $1
       AND restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = $2)
     RETURNING restaurant_id`,
    [itemId, ownerId]
  );
  if (rows.length === 0) {
    throw ApiError.notFound("Menu item not found (or you don't own it)");
  }
  await invalidateMenu(rows[0].restaurant_id);
}

// ---- helper: ownership guard ----
// Throws 404 if the restaurant doesn't exist OR isn't owned by this user.
// One 404 for both cases so we never leak "this restaurant exists but isn't yours".
async function assertOwnsRestaurant(restaurantId: string, ownerId: string): Promise<void> {
  const rows = await query<{ id: string }>(
    "SELECT id FROM restaurants WHERE id = $1 AND owner_id = $2",
    [restaurantId, ownerId]
  );
  if (rows.length === 0) {
    throw ApiError.notFound("Restaurant not found (or you don't own it)");
  }
}
