// restaurant.controller.ts — HTTP layer for restaurants.
// Handlers stay thin: pull what they need from req, call the service, send the
// standard response. If a file was uploaded, multer already put it on req.file —
// we push it to Cloudinary here and hand the URL to the service.

import type { Request, Response } from "express";
import * as restaurantService from "./restaurant.service";
import { uploadImage } from "../../config/cloudinary";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";

// GET /api/restaurants — public list (this is the cached endpoint).
export async function listRestaurantsHandler(_req: Request, res: Response) {
  const restaurants = await restaurantService.listRestaurants();
  return sendSuccess(res, { restaurants, count: restaurants.length }, "Restaurants");
}

// GET /api/restaurants/mine — the logged-in owner's restaurants. Must be ABOVE /:id
// in the routes file, or Express would treat "mine" as an id.
export async function listMyRestaurantsHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const restaurants = await restaurantService.listMyRestaurants(req.user.sub);
  return sendSuccess(res, { restaurants, count: restaurants.length }, "Your restaurants");
}

// GET /api/restaurants/:id — public detail.
export async function getRestaurantHandler(req: Request, res: Response) {
  const restaurant = await restaurantService.getRestaurant(req.params.id as string);
  return sendSuccess(res, { restaurant }, "Restaurant");
}

// POST /api/restaurants — owner creates one. Optional image file under field "image".
export async function createRestaurantHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");

  // if multer parsed a file, upload it to Cloudinary and keep the URL
  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = await uploadImage(req.file.buffer, "restaurants");
  }

  const restaurant = await restaurantService.createRestaurant(req.user.sub, req.body, imageUrl);
  return sendSuccess(res, { restaurant }, "Restaurant created", 201);
}

// PATCH /api/restaurants/:id — owner updates their own. Optional new image.
export async function updateRestaurantHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");

  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = await uploadImage(req.file.buffer, "restaurants");
  }

  const restaurant = await restaurantService.updateRestaurant(
    req.params.id as string,
    req.user.sub,
    req.body,
    imageUrl
  );
  return sendSuccess(res, { restaurant }, "Restaurant updated");
}

// DELETE /api/restaurants/:id — owner deletes their own.
export async function deleteRestaurantHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  await restaurantService.deleteRestaurant(req.params.id as string, req.user.sub);
  return sendSuccess(res, null, "Restaurant deleted");
}
