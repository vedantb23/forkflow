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
  cuisine: string | null;
  description: string | null;
  image_url: string | null;
  address: string | null;
  is_open: boolean;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: string;
  image_url: string | null;
  is_veg: boolean;
  spice_level: number;
  stock: number;
  prep_time_minutes: number;
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
  total_amount: string;
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

export interface OrderView {
  order: Order;
  items: OrderItem[];
}

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export const DELIVERY_STATUSES = ["UNASSIGNED", "ASSIGNED", "PICKED_UP", "DELIVERED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export interface DeliveryAssignment {
  id: string;
  order_id: string;
  partner_id: string | null;
  status: string;
  current_lat: number | null;
  current_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryFeedItem extends OrderView {
  assignment: DeliveryAssignment | null;
}
