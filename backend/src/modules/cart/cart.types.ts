import { ApiError } from "../../utils/apiError";

export interface CartRow {
  id: string;
  user_id: string;
  restaurant_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItemRow {
  id: string;
  cart_id: string;
  menu_item_id: string;
  quantity: number;
}

export interface CartLineItem {
  menu_item_id: string;
  name: string;
  price: string;
  quantity: number;
  stock: number;
  line_total: string;
  is_available: boolean;
}

export interface CartView {
  cart_id: string;
  restaurant_id: string | null;
  items: CartLineItem[];
  total_amount: string;
}

export interface AddItemInput {
  menu_item_id: string;
  quantity: number;
}

export interface UpdateItemInput {
  quantity: number;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function checkQuantity(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) {
    throw ApiError.badRequest("quantity must be a positive integer (1 or more)");
  }
  return n;
}

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

export function validateUpdateItem(body: unknown): UpdateItemInput {
  if (typeof body !== "object" || body === null) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const quantity = checkQuantity(b.quantity);
  return { quantity };
}
