import { query } from "../../config/db";
import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import type {
  CartRow,
  CartItemRow,
  CartView,
  CartLineItem,
  AddItemInput,
} from "./cart.types";
import type { MenuItemRow } from "../menu/menu.types";

async function getOrCreateCart(userId: string): Promise<CartRow> {

  await query(
    `INSERT INTO carts (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );

  const rows = await query<CartRow>("SELECT * FROM carts WHERE user_id = $1", [userId]);
  return rows[0];
}

async function buildCartView(cart: CartRow): Promise<CartView> {

  const items = await query<CartLineItem & { price: string; quantity: number }>(
    `SELECT
       ci.menu_item_id,
       mi.name,
       mi.price,
       ci.quantity,
       mi.stock,
       mi.is_available,
       (mi.price * ci.quantity) AS line_total   -- Postgres does the money math exactly (NUMERIC)
     FROM cart_items ci
     JOIN menu_items mi ON mi.id = ci.menu_item_id
     WHERE ci.cart_id = $1
     ORDER BY mi.name ASC`,
    [cart.id]
  );

  const total = items.reduce((acc, it) => acc + Number(it.line_total), 0);

  return {
    cart_id: cart.id,
    restaurant_id: cart.restaurant_id,
    items: items as CartLineItem[],
    total_amount: total.toFixed(2),
  };
}

export async function getCart(userId: string): Promise<CartView> {
  const cart = await getOrCreateCart(userId);
  return buildCartView(cart);
}

export async function addItem(userId: string, input: AddItemInput): Promise<CartView> {

  const dishRows = await query<MenuItemRow>(
    "SELECT * FROM menu_items WHERE id = $1",
    [input.menu_item_id]
  );
  if (dishRows.length === 0) throw ApiError.notFound("Menu item not found");
  const dish = dishRows[0];
  if (!dish.is_available) throw ApiError.badRequest("This item is not available now!");

  const cart = await getOrCreateCart(userId);

  if (cart.restaurant_id && cart.restaurant_id !== dish.restaurant_id) {
    await query("DELETE FROM cart_items WHERE cart_id = $1", [cart.id]);
  }

  await query("UPDATE carts SET restaurant_id = $1 WHERE id = $2", [
    dish.restaurant_id,
    cart.id,
  ]);

  await query(
    `INSERT INTO cart_items (cart_id, menu_item_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (cart_id, menu_item_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
    [cart.id, input.menu_item_id, input.quantity]
  );

  const updated = await query<CartRow>("SELECT * FROM carts WHERE id = $1", [cart.id]);
  return buildCartView(updated[0]);
}

export async function updateItemQuantity(
  userId: string,
  menuItemId: string,
  quantity: number
): Promise<CartView> {
  const cart = await getOrCreateCart(userId);

  const updated = await query<CartItemRow>(
    `UPDATE cart_items SET quantity = $1
     WHERE cart_id = $2 AND menu_item_id = $3
     RETURNING *`,
    [quantity, cart.id, menuItemId]
  );
  if (updated.length === 0) throw ApiError.notFound("Item not in cart");

  return buildCartView(cart);
}

export async function removeItem(userId: string, menuItemId: string): Promise<CartView> {
  const cart = await getOrCreateCart(userId);

  const removed = await query<CartItemRow>(
    "DELETE FROM cart_items WHERE cart_id = $1 AND menu_item_id = $2 RETURNING *",
    [cart.id, menuItemId]
  );
  if (removed.length === 0) throw ApiError.notFound("Item not in cart");

  const remaining = await query<{ count: string }>(
    "SELECT COUNT(*)::int AS count FROM cart_items WHERE cart_id = $1",
    [cart.id]
  );
  if (Number(remaining[0].count) === 0) {
    await query("UPDATE carts SET restaurant_id = NULL WHERE id = $1", [cart.id]);
  }

  const fresh = await query<CartRow>("SELECT * FROM carts WHERE id = $1", [cart.id]);
  return buildCartView(fresh[0]);
}

export async function clearCart(userId: string): Promise<CartView> {
  const cart = await getOrCreateCart(userId);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM cart_items WHERE cart_id = $1", [cart.id]);
    await client.query("UPDATE carts SET restaurant_id = NULL WHERE id = $1", [cart.id]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  const fresh = await query<CartRow>("SELECT * FROM carts WHERE id = $1", [cart.id]);
  return buildCartView(fresh[0]);
}
