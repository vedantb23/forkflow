// restaurant.routes.ts — URLs for restaurants, mounted at "/api/restaurants".
// Public reads, owner-only writes. Note the middleware order on writes:
//   requireAuth → requireRole → upload.single("image") → validate → handler
// upload runs BEFORE validate because multer is what parses multipart bodies —
// until it runs, req.body is empty for form-data requests.

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

// GET /api/restaurants — public, cached list.
router.get("/", asyncHandler(listRestaurantsHandler));

// GET /api/restaurants/mine — owner's own list. MUST come before "/:id".
router.get(
  "/mine",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  asyncHandler(listMyRestaurantsHandler)
);

// GET /api/restaurants/:id — public detail.
router.get("/:id", asyncHandler(getRestaurantHandler));

// POST /api/restaurants — create (owner/admin). Accepts optional image file.
router.post(
  "/",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  upload.single("image"), // parses multipart form-data; file → req.file, text fields → req.body
  validate(validateCreateRestaurant),
  asyncHandler(createRestaurantHandler)
);

// PATCH /api/restaurants/:id — update own restaurant.
router.patch(
  "/:id",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  upload.single("image"),
  validate(validateUpdateRestaurant),
  asyncHandler(updateRestaurantHandler)
);

// DELETE /api/restaurants/:id — delete own restaurant.
router.delete(
  "/:id",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  asyncHandler(deleteRestaurantHandler)
);

export { router as restaurantRoutes };
