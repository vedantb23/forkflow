// cart.controller.ts — HTTP layer for the cart.
// Handlers stay thin: pull the user id + params from the request, call the
// service, send a standard response. All routes here are customer-only — the
// cart belongs to the logged-in user, identified by req.user.sub (their id).

import type { Request, Response } from "express";
import * as cartService from "./cart.service";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";

// GET /api/cart — return the logged-in user's active cart (creating an empty
// one if they've never had a cart). Includes live menu details + totals.
export async function getCartHandler(req: Request, res: Response) {
  // auth middleware verified the JWT and attached req.user; sub = user id
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const cart = await cartService.getCart(req.user.sub);
  return sendSuccess(res, { cart }, "Your cart");
}

// POST /api/cart/items — add a dish (menu_item_id + quantity) to the cart.
// If the dish is from a different restaurant than the current cart, the service
// clears the cart first (single-restaurant rule).
export async function addItemHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  // req.body was validated + normalized by validate(validateAddItem)
  const cart = await cartService.addItem(req.user.sub, req.body);
  return sendSuccess(res, { cart }, "Item added to cart");
}

// PATCH /api/cart/items/:menuItemId — change the quantity of one line.
export async function updateItemHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const menuItemId = req.params.menuItemId as string;
  // validate(validateUpdateItem) already ran, so req.body is { quantity: number }.
  // The service takes the quantity as a plain number, not the whole body object.
  const cart = await cartService.updateItemQuantity(
    req.user.sub,
    menuItemId,
    req.body.quantity
  );
  return sendSuccess(res, { cart }, "Cart updated");
}

// DELETE /api/cart/items/:menuItemId — remove one line from the cart.
export async function removeItemHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const menuItemId = req.params.menuItemId as string;
  const cart = await cartService.removeItem(req.user.sub, menuItemId);
  return sendSuccess(res, { cart }, "Item removed from cart");
}

// DELETE /api/cart — empty the whole cart.
export async function clearCartHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const cart = await cartService.clearCart(req.user.sub);
  return sendSuccess(res, { cart }, "Cart cleared");
}
