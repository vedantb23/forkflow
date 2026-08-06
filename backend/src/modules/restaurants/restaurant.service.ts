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

export async function listRestaurants(): Promise<RestaurantRow[]> {

  const cached = await getCachedRestaurantList();
  if (cached) return cached;

  const rows = await query<RestaurantRow>(
    "SELECT * FROM restaurants WHERE is_open = true ORDER BY created_at DESC"
  );

  await setCachedRestaurantList(rows);
  return rows;
}

export async function getRestaurant(id: string): Promise<RestaurantRow> {
  const rows = await query<RestaurantRow>("SELECT * FROM restaurants WHERE id = $1", [id]);
  if (rows.length === 0) throw ApiError.notFound("Restaurant not found");
  return rows[0];
}

export async function createRestaurant(
  ownerId: string,
  input: CreateRestaurantInput,
  imageUrl?: string
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
      input.max_orders_per_slot ?? null,
      imageUrl ?? null,
      ownerId,
    ]
  );
  await invalidateRestaurantList();
  return rows[0];
}

export async function updateRestaurant(
  restaurantId: string,
  ownerId: string,
  input: UpdateRestaurantInput,
  imageUrl?: string
): Promise<RestaurantRow> {

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

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

  values.push(restaurantId, ownerId);
  const rows = await query<RestaurantRow>(
    `UPDATE restaurants SET ${sets.join(", ")} WHERE id = $${i} AND owner_id = $${i + 1} RETURNING *`,
    values
  );
  if (rows.length === 0) {

    throw ApiError.notFound("Restaurant not found (or you don't own it)");
  }
  await invalidateRestaurantList();
  return rows[0];
}

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

export async function listMyRestaurants(ownerId: string): Promise<RestaurantRow[]> {
  return query<RestaurantRow>(
    "SELECT * FROM restaurants WHERE owner_id = $1 ORDER BY created_at DESC",
    [ownerId]
  );
}
