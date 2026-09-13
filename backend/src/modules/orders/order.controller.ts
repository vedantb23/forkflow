import type { Request, Response } from "express";
import * as orderService from "./order.service";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";

export async function listAllOrdersHandler(_req: Request, res: Response) {
  const orders = await orderService.listAllOrders();
  return sendSuccess(res, { orders, count: orders.length }, "All orders");
}

export async function adminUpdateOrderStatusHandler(req: Request, res: Response) {
  const result = await orderService.adminUpdateOrderStatus(
    req.params.orderId as string,
    req.body.status
  );
  return sendSuccess(res, result, "Order status updated by admin");
}

export async function placeOrderHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const idempotencyToken = req.headers["idempotency-key"] as string | undefined;
  const result = await orderService.placeOrder(req.user.sub, req.body, idempotencyToken);
  return sendSuccess(res, result, "Order placed", 201);
}

export async function getMyOrdersHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const orders = await orderService.getOrdersForUser(req.user.sub);
  return sendSuccess(res, { orders }, "Your orders");
}

export async function getOrderHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const result = await orderService.getOrderById(req.params.orderId as string);

  if (result.order.user_id !== req.user.sub) throw ApiError.forbidden("Not your order");
  return sendSuccess(res, result, "Order details");
}

export async function getRestaurantOrdersHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const orders = await orderService.getOrdersForRestaurant(
    req.params.restaurantId as string,
    req.user.sub
  );
  return sendSuccess(res, { orders }, "Restaurant orders");
}

export async function updateOrderStatusHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const result = await orderService.updateOrderStatus(
    req.params.orderId as string,
    req.user.sub,
    req.body.status
  );
  return sendSuccess(res, result, "Order status updated");
}
