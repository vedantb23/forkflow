// restaurant.types.ts — shapes + hand-written validators for the restaurants module.
// Same style as auth.types.ts: take untrusted req.body, return a clean typed
// object or throw ApiError.badRequest.

import { ApiError } from "../../utils/apiError";

// What a restaurant row looks like coming out of the DB.
export interface RestaurantRow {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cuisine: string | null;
  address: string | null;
  is_open: boolean;
  max_orders_per_slot: number;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// What creating a restaurant requires.
export interface CreateRestaurantInput {
  name: string;
  description?: string;
  cuisine?: string;
  address?: string;
  max_orders_per_slot?: number;
}

// What an update may change (everything optional — send only what changes).
export interface UpdateRestaurantInput {
  name?: string;
  description?: string;
  cuisine?: string;
  address?: string;
  is_open?: boolean;
  max_orders_per_slot?: number;
}

// quick guard reused below
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// validateCreateRestaurant — name is required, the rest optional.
export function validateCreateRestaurant(body: unknown): CreateRestaurantInput {
  if (typeof body !== "object" || body === null) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.name)) {
    throw ApiError.badRequest("Restaurant name is required");
  }
  // optional strings — if present, must actually be strings
  for (const field of ["description", "cuisine", "address"] as const) {
    if (b[field] !== undefined && typeof b[field] !== "string") {
      throw ApiError.badRequest(`${field} must be a string`);
    }
  }
  // optional capacity — if present, must be a positive integer
  if (b.max_orders_per_slot !== undefined) {
    const n = Number(b.max_orders_per_slot);
    if (!Number.isInteger(n) || n <= 0) {
      throw ApiError.badRequest("max_orders_per_slot must be a positive integer");
    }
  }

  return {
    name: b.name.trim(),
    description: b.description as string | undefined,
    cuisine: b.cuisine as string | undefined,
    address: b.address as string | undefined,
    max_orders_per_slot:
      b.max_orders_per_slot !== undefined ? Number(b.max_orders_per_slot) : undefined,
  };
}

// validateUpdateRestaurant — all optional, but at least ONE field must be sent.
export function validateUpdateRestaurant(body: unknown): UpdateRestaurantInput {
  if (typeof body !== "object" || body === null) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  const b = body as Record<string, unknown>;
  const out: UpdateRestaurantInput = {};

  if (b.name !== undefined) {
    if (!isNonEmptyString(b.name)) throw ApiError.badRequest("name must be a non-empty string");
    out.name = b.name.trim();
  }
  for (const field of ["description", "cuisine", "address"] as const) {
    if (b[field] !== undefined) {
      if (typeof b[field] !== "string") throw ApiError.badRequest(`${field} must be a string`);
      out[field] = b[field] as string;
    }
  }
  if (b.is_open !== undefined) {
    if (typeof b.is_open !== "boolean") throw ApiError.badRequest("is_open must be true or false");
    out.is_open = b.is_open;
  }
  if (b.max_orders_per_slot !== undefined) {
    const n = Number(b.max_orders_per_slot);
    if (!Number.isInteger(n) || n <= 0) {
      throw ApiError.badRequest("max_orders_per_slot must be a positive integer");
    }
    out.max_orders_per_slot = n;
  }

  if (Object.keys(out).length === 0) {
    throw ApiError.badRequest("Provide at least one field to update");
  }
  return out;
}
