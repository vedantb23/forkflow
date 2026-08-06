import { Router } from "express";
import {
  listRestaurantsHandler,
  listMyRestaurantsHandler,
  getRestaurantHandler,
  createRestaurantHandler,
  updateRestaurantHandler,
  deleteRestaurantHandler,
} from "./restaurant.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";
import { upload } from "../../middlewares/upload.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { validateCreateRestaurant, validateUpdateRestaurant } from "./restaurant.types";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(listRestaurantsHandler));

router.get(
  "/mine",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  asyncHandler(listMyRestaurantsHandler)
);

router.get("/:id", asyncHandler(getRestaurantHandler));

router.post(
  "/",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  upload.single("image"),
  validate(validateCreateRestaurant),
  asyncHandler(createRestaurantHandler)
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  upload.single("image"),
  validate(validateUpdateRestaurant),
  asyncHandler(updateRestaurantHandler)
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  asyncHandler(deleteRestaurantHandler)
);

export { router as restaurantRoutes };
