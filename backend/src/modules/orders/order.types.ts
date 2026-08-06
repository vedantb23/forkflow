import { ApiError } from "../../utils/apiError";

export interface OrderRow {
  id: string;
  user_id: string;
  restaurant_id: string;
  status: string;
  total_amount: string;
  slot_window: string;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  menu_item_id: string;
  name_snapshot: string;
  price_snapshot: string;
  quantity: number;
}

export interface OrderView {
  order: OrderRow;
  items: OrderItemRow[];
}

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

export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface UpdateOrderStatusInput {
  status: OrderStatus;
}

export function validateUpdateOrderStatus(body: unknown): UpdateOrderStatusInput {
  if (typeof body !== "object" || body === null)
    throw ApiError.badRequest("Request body must be a JSON object");
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.status) || !ORDER_STATUSES.includes(b.status as OrderStatus))
    throw ApiError.badRequest(`status must be one of: ${ORDER_STATUSES.join(", ")}`);

  return { status: b.status as OrderStatus };
}
