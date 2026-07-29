// order.types.ts — shapes + validators for placing an order.

import { ApiError } from "../../utils/apiError";

// What the DB returns for an order row.
export interface OrderRow {
  id: string;
  user_id: string;
  restaurant_id: string;
  status: string;
  total_amount: string; // NUMERIC → string from pg
  slot_window: string;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

// What the DB returns for an order_items row.
export interface OrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string;
  name_snapshot: string;
  price_snapshot: string;
  quantity: number;
}

// The full order view returned to the client.
export interface OrderView {
  order: OrderRow;
  items: OrderItemRow[];
}

// Input for POST /api/orders — the client sends cart items + optional idempotency key.
// (The idempotency key comes from the header, not the body.)
export interface PlaceOrderInput {
  restaurant_id: string;
  items: { menu_item_id: string; quantity: number }[];
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function validatePlaceOrder(body: unknown): PlaceOrderInput {
  if (typeof body !== "object" || body === null)
    throw ApiError.badRequest("Request body must be a JSON object");

  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.restaurant_id))
    throw ApiError.badRequest("restaurant_id is required");

  if (!Array.isArray(b.items) || b.items.length === 0)
    throw ApiError.badRequest("items must be a non-empty array");

  for (const item of b.items) {
    if (typeof item !== "object" || item === null)
      throw ApiError.badRequest("Each item must be an object");
    const it = item as Record<string, unknown>;
    if (!isNonEmptyString(it.menu_item_id))
      throw ApiError.badRequest("Each item must have a menu_item_id");
    const qty = Number(it.quantity);
    if (!Number.isInteger(qty) || qty < 1)
      throw ApiError.badRequest("Each item quantity must be a positive integer");
  }

  return {
    restaurant_id: (b.restaurant_id as string).trim(),
    items: (b.items as any[]).map((it) => ({
      menu_item_id: (it.menu_item_id as string).trim(),
      quantity: Number(it.quantity),
    })),
  };
}

// The valid order statuses (must match the DB order_status enum exactly).
export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// Input for PATCH /api/orders/:orderId/status — the owner sends the new status.
export interface UpdateOrderStatusInput {
  status: OrderStatus;
}

// Validate PATCH /api/orders/:orderId/status body.
export function validateUpdateOrderStatus(body: unknown): UpdateOrderStatusInput {
  if (typeof body !== "object" || body === null)
    throw ApiError.badRequest("Request body must be a JSON object");
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.status) || !ORDER_STATUSES.includes(b.status as OrderStatus))
    throw ApiError.badRequest(`status must be one of: ${ORDER_STATUSES.join(", ")}`);

  return { status: b.status as OrderStatus };
}
