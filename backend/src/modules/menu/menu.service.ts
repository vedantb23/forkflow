import { query } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { ingestQueue } from "../../queues";
import { getCachedMenu, setCachedMenu, invalidateMenu } from "./menu.cache";
import type {
  MenuItemRow,
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "./menu.types";

export async function listMenu(restaurantId: string): Promise<MenuItemRow[]> {

  const cached = await getCachedMenu(restaurantId);
  if (cached) return cached;

  const rows = await query<MenuItemRow>(
    `SELECT * FROM menu_items
     WHERE restaurant_id = $1 AND is_available = true
     ORDER BY created_at DESC`,
    [restaurantId]
  );

  await setCachedMenu(restaurantId, rows);
  return rows;
}

export async function listMenuForOwner(
  restaurantId: string,
  ownerId: string
): Promise<MenuItemRow[]> {

  await assertOwnsRestaurant(restaurantId, ownerId);
  return query<MenuItemRow>(
    "SELECT * FROM menu_items WHERE restaurant_id = $1 ORDER BY created_at DESC",
    [restaurantId]
  );
}

export async function createMenuItem(
  restaurantId: string,
  ownerId: string,
  input: CreateMenuItemInput,
  imageUrl?: string
): Promise<MenuItemRow> {

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
      input.is_veg ?? null,
      input.spice_level ?? null,
      input.stock ?? null,
      input.prep_time_minutes ?? null,
    ]
  );
  await invalidateMenu(restaurantId);

  ingestQueue.add("ingest", { menuItemId: rows[0].id }).catch((err) => {

  });

  return rows[0];
}

export async function updateMenuItem(
  itemId: string,
  ownerId: string,
  input: UpdateMenuItemInput,
  imageUrl?: string
): Promise<MenuItemRow> {

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

  values.push(itemId, ownerId);
  const rows = await query<MenuItemRow>(
    `UPDATE menu_items SET ${sets.join(", ")}
     WHERE id = $${i}
       AND restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = $${i + 1})
     RETURNING *`,
    values
  );
  if (rows.length === 0) {

    throw ApiError.notFound("Menu item not found (or you don't own it)");
  }
  await invalidateMenu(rows[0].restaurant_id);

  ingestQueue.add("ingest", { menuItemId: rows[0].id }).catch(() => {});

  return rows[0];
}

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

async function assertOwnsRestaurant(restaurantId: string, ownerId: string): Promise<void> {
  const rows = await query<{ id: string }>(
    "SELECT id FROM restaurants WHERE id = $1 AND owner_id = $2",
    [restaurantId, ownerId]
  );
  if (rows.length === 0) {
    throw ApiError.notFound("Restaurant not found (or you don't own it)");
  }
}
