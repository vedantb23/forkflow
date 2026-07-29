// delivery.controller.ts — HTTP layer for delivery. Thin: parse → call service → respond.

import type { Request, Response } from "express";
import * as deliveryService from "./delivery.service";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";

// GET /api/delivery/available — the partner's job feed (orders ready to carry).
// DELIVERY role only (enforced in the route).
export async function getAvailableDeliveriesHandler(_req: Request, res: Response) {
  const orders = await deliveryService.getAvailableDeliveries();
  return sendSuccess(res, { orders }, "Available deliveries");
}

// GET /api/delivery/:orderId — get the assignment for an order.
// Accessible by the customer, the assigned partner, owner, or admin.
export async function getAssignmentHandler(req: Request, res: Response) {
  const assignment = await deliveryService.getAssignment(req.params.orderId as string);
  return sendSuccess(res, { assignment }, "Delivery assignment");
}

// POST /api/delivery/assign — assign a delivery partner to an order.
// RESTAURANT_OWNER / ADMIN only (enforced in routes via requireRole).
export async function assignPartnerHandler(req: Request, res: Response) {
  const { order_id, partner_id } = req.body as { order_id: string; partner_id: string };
  const assignment = await deliveryService.assignPartner(order_id, partner_id);
  return sendSuccess(res, { assignment }, "Partner assigned", 201);
}

// POST /api/delivery/:orderId/claim — a partner claims an available order.
// DELIVERY role only.
export async function claimDeliveryHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const assignment = await deliveryService.claimDelivery(
    req.params.orderId as string,
    req.user.sub
  );
  return sendSuccess(res, { assignment }, "Trip claimed", 201);
}

// PATCH /api/delivery/:orderId/status — partner updates their delivery status.
// DELIVERY role only.
export async function updateStatusHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const assignment = await deliveryService.updateStatus(
    req.params.orderId as string,
    req.user.sub,
    req.body.status
  );
  return sendSuccess(res, { assignment }, "Status updated");
}

// PATCH /api/delivery/:orderId/location — partner pushes a GPS position.
// DELIVERY role only.
export async function updateLocationHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const { lat, lng } = req.body as { lat: number; lng: number };
  const assignment = await deliveryService.updateLocation(
    req.params.orderId as string,
    req.user.sub,
    lat,
    lng
  );
  return sendSuccess(res, { assignment }, "Location updated");
}
