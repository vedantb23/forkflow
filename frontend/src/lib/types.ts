// Shared shapes mirrored from the backend responses. Keep these in sync with the
// API's { success, message, data } envelope and the DB rows.

export type Role = "CUSTOMER" | "RESTAURANT_OWNER" | "DELIVERY" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  address: string | null;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: string; // numeric comes back as string from pg
  image_url: string | null;
  is_available: boolean;
}

export interface CartLine {
  menu_item_id: string;
  name: string;
  price: string;
  quantity: number;
}

export interface Cart {
  id: string;
  restaurant_id: string | null;
  items: CartLine[];
}

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED";

export interface Order {
  id: string;
  user_id: string;
  restaurant_id: string;
  status: OrderStatus;
  total_amount: string; // NUMERIC → string from pg
  slot_window: string;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  name_snapshot: string;
  price_snapshot: string;
  quantity: number;
}

// Full order view returned by POST /orders and GET /orders/:id.
export interface OrderView {
  order: Order;
  items: OrderItem[];
}

// The API always wraps payloads as { success, message, data }.
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

// Delivery statuses — must match the backend DB enum exactly.
export const DELIVERY_STATUSES = ["UNASSIGNED", "ASSIGNED", "PICKED_UP", "DELIVERED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];
