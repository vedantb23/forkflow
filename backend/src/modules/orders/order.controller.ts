// order.controller.ts — HTTP layer for orders. Thin: parse request, call service, respond.

import type { Request, Response } from "express";
import * as orderService from "./order.service";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";

// POST /api/orders — place a new order.
// The client SHOULD send an `Idempotency-Key` header (a UUID they generate).
// If they retry with the same key, they get the same order back — no duplicate.
export async function placeOrderHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const idempotencyToken = req.headers["idempotency-key"] as string | undefined;
  const result = await orderService.placeOrder(req.user.sub, req.body, idempotencyToken);
  return sendSuccess(res, result, "Order placed", 201);
}

// GET /api/orders — list the logged-in customer's orders.
export async function getMyOrdersHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const orders = await orderService.getOrdersForUser(req.user.sub);
  return sendSuccess(res, { orders }, "Your orders");
}

// GET /api/orders/:orderId — get one order (must belong to the caller).
export async function getOrderHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const result = await orderService.getOrderById(req.params.orderId as string);
  // Ensure the order belongs to the requesting user (not another customer's order).
  if (result.order.user_id !== req.user.sub) throw ApiError.forbidden("Not your order");
  return sendSuccess(res, result, "Order details");
}

// GET /api/orders/restaurant/:restaurantId — the owner's live order feed (KDS).
// requireRole in the route already guarantees the caller is an OWNER/ADMIN; the
// service adds the per-restaurant ownership check so an owner only sees THEIR feed.
export async function getRestaurantOrdersHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const orders = await orderService.getOrdersForRestaurant(
    req.params.restaurantId as string,
    req.user.sub
  );
  return sendSuccess(res, { orders }, "Restaurant orders");
}

// PATCH /api/orders/:orderId/status — owner advances an order's status.
// The service verifies ownership and emits the change to the customer live.
export async function updateOrderStatusHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const result = await orderService.updateOrderStatus(
    req.params.orderId as string,
    req.user.sub,
    req.body.status
  );
  return sendSuccess(res, result, "Order status updated");
}
