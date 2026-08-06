import type { Request, Response } from "express";
import * as deliveryService from "./delivery.service";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";

export async function getAvailableDeliveriesHandler(_req: Request, res: Response) {
  const orders = await deliveryService.getAvailableDeliveries();
  return sendSuccess(res, { orders }, "Available deliveries");
}

export async function getAssignmentHandler(req: Request, res: Response) {
  const assignment = await deliveryService.getAssignment(req.params.orderId as string);
  return sendSuccess(res, { assignment }, "Delivery assignment");
}

export async function assignPartnerHandler(req: Request, res: Response) {
  const { order_id, partner_id } = req.body as { order_id: string; partner_id: string };
  const assignment = await deliveryService.assignPartner(order_id, partner_id);
  return sendSuccess(res, { assignment }, "Partner assigned", 201);
}

export async function claimDeliveryHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const assignment = await deliveryService.claimDelivery(
    req.params.orderId as string,
    req.user.sub
  );
  return sendSuccess(res, { assignment }, "Trip claimed", 201);
}

export async function updateStatusHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const assignment = await deliveryService.updateStatus(
    req.params.orderId as string,
    req.user.sub,
    req.body.status
  );
  return sendSuccess(res, { assignment }, "Status updated");
}

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
