import type { Request, Response } from "express";
import * as cartService from "./cart.service";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";

export async function getCartHandler(req: Request, res: Response) {

  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const cart = await cartService.getCart(req.user.sub);
  return sendSuccess(res, { cart }, "Your cart");
}

export async function addItemHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");

  const cart = await cartService.addItem(req.user.sub, req.body);
  return sendSuccess(res, { cart }, "Item added to cart");
}

export async function updateItemHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const menuItemId = req.params.menuItemId as string;

  const cart = await cartService.updateItemQuantity(
    req.user.sub,
    menuItemId,
    req.body.quantity
  );
  return sendSuccess(res, { cart }, "Cart updated");
}

export async function removeItemHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const menuItemId = req.params.menuItemId as string;
  const cart = await cartService.removeItem(req.user.sub, menuItemId);
  return sendSuccess(res, { cart }, "Item removed from cart");
}

export async function clearCartHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const cart = await cartService.clearCart(req.user.sub);
  return sendSuccess(res, { cart }, "Cart cleared");
}
