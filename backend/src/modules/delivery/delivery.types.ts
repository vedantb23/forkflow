// delivery.types.ts — shapes + validators for the delivery module (Day 6).
//
// A delivery_assignment links ONE order to ONE delivery partner and tracks their
// live status + GPS. The status enum matches the DB: UNASSIGNED → ASSIGNED →
// PICKED_UP → DELIVERED (see db/schema.sql delivery_status).

import { ApiError } from "../../utils/apiError";

// Step 1 — what the DB returns for a delivery_assignments row.
export interface DeliveryAssignmentRow {
  id: string;
  order_id: string;
  partner_id: string | null; // null until a partner is assigned
  status: string; // delivery_status enum as text from pg
  current_lat: number | null; // DOUBLE PRECISION → number from pg
  current_lng: number | null;
  created_at: string;
  updated_at: string;
}

// Step 2 — the valid delivery statuses (must match the DB enum exactly).
export const DELIVERY_STATUSES = ["UNASSIGNED", "ASSIGNED", "PICKED_UP", "DELIVERED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

// Step 3 — input for assigning a partner to an order. POST /api/delivery/assign.
export interface AssignPartnerInput {
  order_id: string;
  partner_id: string;
}

// Step 4 — input for updating an assignment's status. PATCH /api/delivery/:orderId/status.
export interface UpdateStatusInput {
  status: DeliveryStatus;
}

// Step 5 — input for pushing a location over HTTP (sockets also do this live).
export interface UpdateLocationInput {
  lat: number;
  lng: number;
}

// ---- validators (hand-written, same style as order.types.ts) ----

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// Validate POST /api/delivery/assign body.
export function validateAssignPartner(body: unknown): AssignPartnerInput {
  if (typeof body !== "object" || body === null)
    throw ApiError.badRequest("Request body must be a JSON object");
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.order_id)) throw ApiError.badRequest("order_id is required");
  if (!isNonEmptyString(b.partner_id)) throw ApiError.badRequest("partner_id is required");

  return {
    order_id: (b.order_id as string).trim(),
    partner_id: (b.partner_id as string).trim(),
  };
}

// Validate PATCH /api/delivery/:orderId/status body.
export function validateUpdateStatus(body: unknown): UpdateStatusInput {
  if (typeof body !== "object" || body === null)
    throw ApiError.badRequest("Request body must be a JSON object");
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.status) || !DELIVERY_STATUSES.includes(b.status as DeliveryStatus))
    throw ApiError.badRequest(`status must be one of: ${DELIVERY_STATUSES.join(", ")}`);

  return { status: b.status as DeliveryStatus };
}

// Validate PATCH /api/delivery/:orderId/location body.
export function validateUpdateLocation(body: unknown): UpdateLocationInput {
  if (typeof body !== "object" || body === null)
    throw ApiError.badRequest("Request body must be a JSON object");
  const b = body as Record<string, unknown>;

  const lat = Number(b.lat);
  const lng = Number(b.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng))
    throw ApiError.badRequest("lat and lng must be numbers");

  return { lat, lng };
}
