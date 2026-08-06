import type { Request, Response } from "express";
import * as restaurantService from "./restaurant.service";
import { uploadImage } from "../../config/cloudinary";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";

export async function listRestaurantsHandler(_req: Request, res: Response) {
  const restaurants = await restaurantService.listRestaurants();
  return sendSuccess(res, { restaurants, count: restaurants.length }, "Restaurants");
}

export async function listMyRestaurantsHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const restaurants = await restaurantService.listMyRestaurants(req.user.sub);
  return sendSuccess(res, { restaurants, count: restaurants.length }, "Your restaurants");
}

export async function getRestaurantHandler(req: Request, res: Response) {
  const restaurant = await restaurantService.getRestaurant(req.params.id as string);
  return sendSuccess(res, { restaurant }, "Restaurant");
}

export async function createRestaurantHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");

  let imageUrl: string | undefined;
  if (req.file) {
    imageUrl = await uploadImage(req.file.buffer, "restaurants");
  }

  const restaurant = await restaurantService.createRestaurant(req.user.sub, req.body, imageUrl);
  return sendSuccess(res, { restaurant }, "Restaurant created", 201);
}

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

export async function deleteRestaurantHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  await restaurantService.deleteRestaurant(req.params.id as string, req.user.sub);
  return sendSuccess(res, null, "Restaurant deleted");
}
