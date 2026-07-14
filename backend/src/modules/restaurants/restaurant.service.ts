// restaurant.service.ts — business logic for restaurants.
// Key rule: OWNER-SCOPED writes. A RESTAURANT_OWNER can only update/delete
// restaurants where owner_id = their own id. We enforce that in the SQL WHERE
// clause itself — the DB refuses to touch rows the caller doesn't own.

import { query } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import {
  getCachedRestaurantList,
  setCachedRestaurantList,
  invalidateRestaurantList,
} from "./restaurant.cache";
import type {
  RestaurantRow,
  CreateRestaurantInput,
  UpdateRestaurantInput,
} from "./restaurant.types";

// Step 1 — public list, cache-aside. This is THE read-heavy endpoint of the app:
// every visitor hits it, and it changes rarely → perfect cache candidate.
export async function listRestaurants(): Promise<RestaurantRow[]> {
  // 1. try the cache first
  const cached = await getCachedRestaurantList();
  if (cached) return cached;

  // 2. miss → hit the DB (only open restaurants, newest first)
  const rows = await query<RestaurantRow>(
    "SELECT * FROM restaurants WHERE is_open = true ORDER BY created_at DESC"
  );

  // 3. store for next time (TTL handles expiry)
  await setCachedRestaurantList(rows);
  return rows;
}

// Step 2 — one restaurant by id (public detail page).
export async function getRestaurant(id: string): Promise<RestaurantRow> {
  const rows = await query<RestaurantRow>("SELECT * FROM restaurants WHERE id = $1", [id]);
  if (rows.length === 0) throw ApiError.notFound("Restaurant not found");
  return rows[0];
}

// Step 3 — create (owner only; the route guards the role, we just record who owns it).
export async function createRestaurant(
  ownerId: string,
  input: CreateRestaurantInput,
  imageUrl?: string // Cloudinary URL if an image was uploaded
): Promise<RestaurantRow> {
  const rows = await query<RestaurantRow>(
    `INSERT INTO restaurants (name, description, cuisine, address, max_orders_per_slot, image_url, owner_id)
     VALUES ($1, $2, $3, $4, COALESCE($5, 5), $6, $7)
     RETURNING *`,
    [
      input.name,
      input.description ?? null,
      input.cuisine ?? null,
      input.address ?? null,
      input.max_orders_per_slot ?? null, // COALESCE falls back to the default 5
      imageUrl ?? null,
      ownerId,
    ]
  );
  await invalidateRestaurantList(); // list changed → bust the cache
  return rows[0];
}

// Step 4 — update, owner-scoped. Note the WHERE: id AND owner_id must BOTH match.
// If the caller doesn't own this restaurant, zero rows update → 404.
export async function updateRestaurant(
  restaurantId: string,
  ownerId: string,
  input: UpdateRestaurantInput,
  imageUrl?: string
): Promise<RestaurantRow> {
  // build SET fragments dynamically, same pattern as user.service updateProfile
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  // map each provided field to a "column = $n" fragment
  const fields: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    cuisine: input.cuisine,
    address: input.address,
    is_open: input.is_open,
    max_orders_per_slot: input.max_orders_per_slot,
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

  // WHERE id = $n AND owner_id = $n+1 — ownership enforced in the query itself
  values.push(restaurantId, ownerId);
  const rows = await query<RestaurantRow>(
    `UPDATE restaurants SET ${sets.join(", ")} WHERE id = $${i} AND owner_id = $${i + 1} RETURNING *`,
    values
  );
  if (rows.length === 0) {
    // either it doesn't exist or the caller doesn't own it — same answer either way
    throw ApiError.notFound("Restaurant not found (or you don't own it)");
  }
  await invalidateRestaurantList();
  return rows[0];
}

// Step 5 — delete, owner-scoped (same WHERE trick). Menu items go with it (ON DELETE CASCADE).
export async function deleteRestaurant(restaurantId: string, ownerId: string): Promise<void> {
  const rows = await query<RestaurantRow>(
    "DELETE FROM restaurants WHERE id = $1 AND owner_id = $2 RETURNING id",
    [restaurantId, ownerId]
  );
  if (rows.length === 0) {
    throw ApiError.notFound("Restaurant not found (or you don't own it)");
  }
  await invalidateRestaurantList();
}

// Step 6 — the owner's own restaurants (for their dashboard).
export async function listMyRestaurants(ownerId: string): Promise<RestaurantRow[]> {
  return query<RestaurantRow>(
    "SELECT * FROM restaurants WHERE owner_id = $1 ORDER BY created_at DESC",
    [ownerId]
  );
}
