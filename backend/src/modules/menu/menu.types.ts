// menu.types.ts — shapes + validators for menu items.

import { ApiError } from "../../utils/apiError";

// A menu item row from the DB. (embedding column arrives Day 7 — not here.)
export interface MenuItemRow {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: string; // NUMERIC comes back from pg as a string — keeps money exact
  image_url: string | null;
  is_veg: boolean;
  spice_level: number;
  stock: number;
  prep_time_minutes: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateMenuItemInput {
  name: string;
  description?: string;
  price: number;
  is_veg?: boolean;
  spice_level?: number;
  stock?: number;
  prep_time_minutes?: number;
}

export interface UpdateMenuItemInput {
  name?: string;
  description?: string;
  price?: number;
  is_veg?: boolean;
  spice_level?: number;
  stock?: number;
  prep_time_minutes?: number;
  is_available?: boolean;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// price must be a positive number; spice 0–3; stock/prep non-negative ints.
// Shared checks used by both validators below.
function checkNumericFields(b: Record<string, unknown>) {
  if (b.price !== undefined) {
    const n = Number(b.price);
    if (Number.isNaN(n) || n <= 0) throw ApiError.badRequest("price must be a positive number");
  }
  if (b.spice_level !== undefined) {
    const n = Number(b.spice_level);
    if (!Number.isInteger(n) || n < 0 || n > 3) {
      throw ApiError.badRequest("spice_level must be an integer 0-3");
    }
  }
  for (const field of ["stock", "prep_time_minutes"] as const) {
    if (b[field] !== undefined) {
      const n = Number(b[field]);
      if (!Number.isInteger(n) || n < 0) {
        throw ApiError.badRequest(`${field} must be a non-negative integer`);
      }
    }
  }
  for (const field of ["is_veg", "is_available"] as const) {
    if (b[field] !== undefined) {
      if (b[field] === "true") b[field] = true;
      if (b[field] === "false") b[field] = false;
      if (typeof b[field] !== "boolean") {
        throw ApiError.badRequest(`${field} must be true or false`);
      }
    }
  }
}

export function validateCreateMenuItem(body: unknown): CreateMenuItemInput {
  if (typeof body !== "object" || body === null) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.name)) throw ApiError.badRequest("Item name is required");
  if (b.price === undefined) throw ApiError.badRequest("price is required");
  if (b.description !== undefined && typeof b.description !== "string") {
    throw ApiError.badRequest("description must be a string");
  }
  checkNumericFields(b);

  return {
    name: b.name.trim(),
    description: b.description as string | undefined,
    price: Number(b.price),
    is_veg: b.is_veg as boolean | undefined,
    spice_level: b.spice_level !== undefined ? Number(b.spice_level) : undefined,
    stock: b.stock !== undefined ? Number(b.stock) : undefined,
    prep_time_minutes: b.prep_time_minutes !== undefined ? Number(b.prep_time_minutes) : undefined,
  };
}

export function validateUpdateMenuItem(body: unknown): UpdateMenuItemInput {
  if (typeof body !== "object" || body === null) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  const b = body as Record<string, unknown>;

  if (b.name !== undefined && !isNonEmptyString(b.name)) {
    throw ApiError.badRequest("name must be a non-empty string");
  }
  if (b.description !== undefined && typeof b.description !== "string") {
    throw ApiError.badRequest("description must be a string");
  }
  checkNumericFields(b);

  const out: UpdateMenuItemInput = {};
  if (b.name !== undefined) out.name = (b.name as string).trim();
  if (b.description !== undefined) out.description = b.description as string;
  if (b.price !== undefined) out.price = Number(b.price);
  if (b.is_veg !== undefined) out.is_veg = b.is_veg as boolean;
  if (b.spice_level !== undefined) out.spice_level = Number(b.spice_level);
  if (b.stock !== undefined) out.stock = Number(b.stock);
  if (b.prep_time_minutes !== undefined) out.prep_time_minutes = Number(b.prep_time_minutes);
  if (b.is_available !== undefined) out.is_available = b.is_available as boolean;

  if (Object.keys(out).length === 0) {
    throw ApiError.badRequest("Provide at least one field to update");
  }
  return out;
}
