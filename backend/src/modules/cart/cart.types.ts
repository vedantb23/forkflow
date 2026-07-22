// cart.types.ts — shapes + validators for the cart.
//
// The cart is where a diner collects dishes before placing an order. Our schema
// enforces two rules we mirror here:
//   1. ONE active cart per user (carts.user_id is UNIQUE).
//   2. A cart holds items from a SINGLE restaurant (carts.restaurant_id). Adding
//      a dish from a different restaurant clears the cart first — you can't order
//      from two kitchens in one order.
//
// No validation library on purpose (README rule): we hand-write the checks so
// it's obvious what "valid" means — field present, right type, sane range.

import { ApiError } from "../../utils/apiError";

// ---- DB row shapes ----

// A row from the `carts` table. restaurant_id is null when the cart is empty.
export interface CartRow {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  created_at: string;
  updated_at: string;
}

// A row from the `cart_items` table (one dish + quantity in a cart).
export interface CartItemRow {
  id: string;
  cart_id: string;
  menu_item_id: string;
  quantity: number;
}

// The shape we return to clients: the cart plus its line items joined with the
// live menu details (name, price, stock) so the frontend can render + price it.
export interface CartLineItem {
  menu_item_id: string;
  name: string;
  price: string; // NUMERIC comes back from pg as a string — keeps money exact
  quantity: number;
  stock: number; // current available stock (so UI can warn "only 2 left")
  line_total: string; // price * quantity, computed as a string to stay exact
  is_available: boolean;
}

export interface CartView {
  cart_id: string;
  restaurant_id: string | null;
  items: CartLineItem[];
  total_amount: string; // sum of all line_totals
}

// ---- validated inputs ----

// Adding an item to the cart: which dish, how many.
export interface AddItemInput {
  menu_item_id: string;
  quantity: number;
}

// Updating a line: the new quantity (0 is rejected — use remove instead).
export interface UpdateItemInput {
  quantity: number;
}

// ---- validators ----

// A UUID-ish check: we don't need strict RFC validation, just "is this a
// non-empty string that looks like an id". The DB will reject a truly bad id.
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// quantity must be a positive integer (you can't order 0 or 2.5 samosas).
function checkQuantity(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) {
    throw ApiError.badRequest("quantity must be a positive integer (1 or more)");
  }
  return n;
}

// POST /api/cart/items — add a dish to the cart.
export function validateAddItem(body: unknown): AddItemInput {
  if (typeof body !== "object" || body === null) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.menu_item_id)) {
    throw ApiError.badRequest("menu_item_id is required");
  }
  const quantity = checkQuantity(b.quantity);

  return { menu_item_id: b.menu_item_id.trim(), quantity };
}

// PATCH /api/cart/items/:menuItemId — change a line's quantity.
export function validateUpdateItem(body: unknown): UpdateItemInput {
  if (typeof body !== "object" || body === null) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const quantity = checkQuantity(b.quantity);
  return { quantity };
}
