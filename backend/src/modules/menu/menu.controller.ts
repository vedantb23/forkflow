// menu.controller.ts — HTTP layer for menu items (dishes).
// Same pattern as restaurant.controller: handlers stay thin —
// pull what they need from req, call the service, send the response.
// If a file was uploaded, multer put it on req.file; we push it to Cloudinary
// here and hand the URL to the service.
//
// Key difference from restaurants: a menu item has NO owner_id column.
// Ownership is *transitive* — through its restaurant. The service layer
// handles that check (joins back to restaurants.owner_id in SQL).

import type { Request, Response } from "express";
import * as menuService from "./menu.service";
import { uploadImage } from "../../config/cloudinary";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";

// GET /api/menu/:restaurantId — public list of available items for a restaurant.
// This is the read-heavy endpoint diners hit when they open a restaurant page.
// It goes through cache-aside: Redis first, DB on miss.
export async function listMenuHandler(req: Request, res: Response) {
  // grab the restaurant id from the URL parameter
  const restaurantId = req.params.restaurantId as string;
  // call the service — it handles cache-aside internally
  const items = await menuService.listMenu(restaurantId);
  return sendSuccess(res, { items, count: items.length }, "Menu items");
}

// GET /api/menu/:restaurantId/owner — the owner's FULL menu (includes
// unavailable/out-of-stock items). Useful for the restaurant dashboard.
// Not cached because it's low-traffic and must always be fresh.
export async function listMenuForOwnerHandler(req: Request, res: Response) {
  // auth middleware already verified the JWT and attached req.user
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const restaurantId = req.params.restaurantId as string;
  // service checks that this user actually owns the restaurant
  const items = await menuService.listMenuForOwner(restaurantId, req.user.sub);
  return sendSuccess(res, { items, count: items.length }, "Your menu items");
}

// POST /api/menu/:restaurantId — owner creates a new dish under their restaurant.
// Accepts an optional image file under field "image" (parsed by multer).
export async function createMenuItemHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const restaurantId = req.params.restaurantId as string;

  // if multer parsed a file, upload it to Cloudinary and get back the URL
  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = await uploadImage(req.file.buffer, "menu"); // stored under forkflow/menu in Cloudinary
  }

  // service creates the row and invalidates the menu cache for this restaurant
  const item = await menuService.createMenuItem(restaurantId, req.user.sub, req.body, imageUrl);
  return sendSuccess(res, { item }, "Menu item created", 201);
}

// PATCH /api/menu/items/:itemId — owner updates a dish they own (transitively).
// Accepts an optional new image.
export async function updateMenuItemHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const itemId = req.params.itemId as string;

  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = await uploadImage(req.file.buffer, "menu");
  }

  // service checks ownership via the SQL join, updates, and invalidates cache
  const item = await menuService.updateMenuItem(itemId, req.user.sub, req.body, imageUrl);
  return sendSuccess(res, { item }, "Menu item updated");
}

// DELETE /api/menu/items/:itemId — owner deletes a dish they own (transitively).
export async function deleteMenuItemHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const itemId = req.params.itemId as string;
  // service checks ownership, deletes, and invalidates cache
  await menuService.deleteMenuItem(itemId, req.user.sub);
  return sendSuccess(res, null, "Menu item deleted");
}
