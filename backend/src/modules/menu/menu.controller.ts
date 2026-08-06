import type { Request, Response } from "express";
import * as menuService from "./menu.service";
import { uploadImage } from "../../config/cloudinary";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";

export async function listMenuHandler(req: Request, res: Response) {

  const restaurantId = req.params.restaurantId as string;

  const items = await menuService.listMenu(restaurantId);
  return sendSuccess(res, { items, count: items.length }, "Menu items");
}

export async function listMenuForOwnerHandler(req: Request, res: Response) {

  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const restaurantId = req.params.restaurantId as string;

  const items = await menuService.listMenuForOwner(restaurantId, req.user.sub);
  return sendSuccess(res, { items, count: items.length }, "Your menu items");
}

export async function createMenuItemHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const restaurantId = req.params.restaurantId as string;

  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = await uploadImage(req.file.buffer, "menu");
  }

  const item = await menuService.createMenuItem(restaurantId, req.user.sub, req.body, imageUrl);
  return sendSuccess(res, { item }, "Menu item created", 201);
}

export async function updateMenuItemHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const itemId = req.params.itemId as string;

  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = await uploadImage(req.file.buffer, "menu");
  }

  const item = await menuService.updateMenuItem(itemId, req.user.sub, req.body, imageUrl);
  return sendSuccess(res, { item }, "Menu item updated");
}

export async function deleteMenuItemHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const itemId = req.params.itemId as string;

  await menuService.deleteMenuItem(itemId, req.user.sub);
  return sendSuccess(res, null, "Menu item deleted");
}
