import { ApiError } from "../../utils/apiError";

export interface DeliveryAssignmentRow {
  id: string;
  order_id: string;
  partner_id: string | null;
  status: string;
  current_lat: number | null;
  current_lng: number | null;
  created_at: string;
  updated_at: string;
}

export const DELIVERY_STATUSES = ["UNASSIGNED", "ASSIGNED", "PICKED_UP", "DELIVERED"] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export interface AssignPartnerInput {
  order_id: string;
  partner_id: string;
}

export interface UpdateStatusInput {
  status: DeliveryStatus;
}

export interface UpdateLocationInput {
  lat: number;
  lng: number;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

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

export function validateUpdateStatus(body: unknown): UpdateStatusInput {
  if (typeof body !== "object" || body === null)
    throw ApiError.badRequest("Request body must be a JSON object");
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.status) || !DELIVERY_STATUSES.includes(b.status as DeliveryStatus))
    throw ApiError.badRequest(`status must be one of: ${DELIVERY_STATUSES.join(", ")}`);

  return { status: b.status as DeliveryStatus };
}

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
