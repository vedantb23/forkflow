// cart.service.ts — business logic for the shopping cart.
//
// Design rules enforced here (they come straight from the DB schema):
//   1. ONE active cart per user. We "get or create" it: first call makes the
//      row, later calls reuse it (carts.user_id is UNIQUE).
//   2. A cart belongs to ONE restaurant at a time. If you add a dish from a
//      different restaurant, we CLEAR the cart and re-point it — you can't mix
//      two kitchens in a single order.
//
// The cart does NOT touch stock. It's just a wish-list. Stock is only fought
// over at order time (Day 4 orders module) — that's where the race lives. The
// cart can happily hold 5 of something that only has 3 in stock; the order step
// is what rejects it. This keeps the cart cheap and lock-free.

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

// Step 1 — get the user's cart, creating an empty one if they don't have it yet.
// "ON CONFLICT (user_id) DO NOTHING" makes the INSERT a no-op if the cart row
// already exists (thanks to the UNIQUE constraint), so this is safe to call on
// every cart operation without ever creating a duplicate.
async function getOrCreateCart(userId: string): Promise<CartRow> {
  // try to insert a fresh cart; if one already exists, do nothing
  await query(
    `INSERT INTO carts (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
  // now fetch it (it definitely exists after the upsert above)
  const rows = await query<CartRow>("SELECT * FROM carts WHERE user_id = $1", [userId]);
  return rows[0];
}

// Step 2 — build the full "view" of a cart: its line items joined with the LIVE
// menu data (name, current price, current stock). We join every read so the
// client always sees up-to-date prices/stock, not a stale snapshot. (Snapshots
// only happen at order time, in order_items.)
async function buildCartView(cart: CartRow): Promise<CartView> {
  // pull each cart line together with the dish it points to
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

  // sum the line totals for a cart-level total. We sum as numbers then format to
  // 2 decimals — fine for display; the authoritative money math re-runs in SQL
  // at order time.
  const total = items.reduce((acc, it) => acc + Number(it.line_total), 0);

  return {
    cart_id: cart.id,
    restaurant_id: cart.restaurant_id,
    items: items as CartLineItem[],
    total_amount: total.toFixed(2),
  };
}

// Step 3 — read the current cart (get-or-create, then view).
export async function getCart(userId: string): Promise<CartView> {
  const cart = await getOrCreateCart(userId);
  return buildCartView(cart);
}

// Step 4 — add a dish to the cart (or bump its quantity if already present).
// This is where the single-restaurant rule is enforced.
export async function addItem(userId: string, input: AddItemInput): Promise<CartView> {
  // 4a) look up the dish so we know (a) it exists, (b) which restaurant it's
  //     from, and (c) whether it's orderable at all.
  const dishRows = await query<MenuItemRow>(
    "SELECT * FROM menu_items WHERE id = $1",
    [input.menu_item_id]
  );
  if (dishRows.length === 0) throw ApiError.notFound("Menu item not found");
  const dish = dishRows[0];
  if (!dish.is_available) throw ApiError.badRequest("This item is not available now!");

  // 4b) get (or create) the cart.
  const cart = await getOrCreateCart(userId);

  // 4c) single-restaurant rule. If the cart already holds items from a DIFFERENT
  //     restaurant, wipe it clean and re-point it at the new restaurant.
  if (cart.restaurant_id && cart.restaurant_id !== dish.restaurant_id) {
    await query("DELETE FROM cart_items WHERE cart_id = $1", [cart.id]);
  }
  // set/refresh the cart's restaurant (covers first-add and the cleared case)
  await query("UPDATE carts SET restaurant_id = $1 WHERE id = $2", [
    dish.restaurant_id,
    cart.id,
  ]);

  // 4d) insert the line, or if the dish is already in the cart, ADD to its
  //     quantity. The UNIQUE (cart_id, menu_item_id) constraint powers the
  //     ON CONFLICT upsert.
  await query(
    `INSERT INTO cart_items (cart_id, menu_item_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (cart_id, menu_item_id)
     DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity`,
    [cart.id, input.menu_item_id, input.quantity]
  );

  // 4e) return the fresh view. Re-fetch the cart row so restaurant_id is current.
  const updated = await query<CartRow>("SELECT * FROM carts WHERE id = $1", [cart.id]);
  return buildCartView(updated[0]);
}

// Step 5 — set the quantity of a line to an exact number (not add — replace).
// Used by the "+/-" steppers on a cart page once an item is already in it.
export async function updateItemQuantity(
  userId: string,
  menuItemId: string,
  quantity: number
): Promise<CartView> {
  const cart = await getOrCreateCart(userId);

  // update the line, scoped to THIS user's cart so nobody can edit another's.
  const updated = await query<CartItemRow>(
    `UPDATE cart_items SET quantity = $1
     WHERE cart_id = $2 AND menu_item_id = $3
     RETURNING *`,
    [quantity, cart.id, menuItemId]
  );
  if (updated.length === 0) throw ApiError.notFound("Item not in cart");

  return buildCartView(cart);
}

// Step 6 — remove a single line from the cart. If that empties the cart, we also
// clear its restaurant_id so the next add can start fresh with any restaurant.
export async function removeItem(userId: string, menuItemId: string): Promise<CartView> {
  const cart = await getOrCreateCart(userId);

  const removed = await query<CartItemRow>(
    "DELETE FROM cart_items WHERE cart_id = $1 AND menu_item_id = $2 RETURNING *",
    [cart.id, menuItemId]
  );
  if (removed.length === 0) throw ApiError.notFound("Item not in cart");

  // if the cart is now empty, detach it from its restaurant
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

// Step 7 — empty the whole cart (used by "clear cart" and after a successful
// order). Deletes all lines and detaches the restaurant in one go.
export async function clearCart(userId: string): Promise<CartView> {
  const cart = await getOrCreateCart(userId);
  // a transaction so both statements land together (all-or-nothing)
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
