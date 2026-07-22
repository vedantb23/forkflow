// cart.routes.ts — URLs for the shopping cart, mounted at "/api/cart".
//
// Route design:
//   GET    /                     — read the logged-in user's active cart
//   POST   /items                — add a dish (menu_item_id + quantity)
//   PATCH  /items/:menuItemId    — set a line's quantity to an exact number
//   DELETE /items/:menuItemId    — remove one line
//   DELETE /                     — empty the whole cart
//
// EVERY cart route is customer-only: the cart belongs to the logged-in user, so
// each route starts with requireAuth. Unlike menu/restaurant writes there is no
// requireRole here — any authenticated user (a CUSTOMER) owns a cart. The service
// always scopes queries by req.user.sub, so a user can only ever touch their own.
//
// Middleware order on writes: requireAuth → validate → handler.
// (No multer here — the cart takes JSON, not file uploads.)

import { Router } from "express";
import {
  getCartHandler,
  addItemHandler,
  updateItemHandler,
  removeItemHandler,
  clearCartHandler,
} from "./cart.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { validateAddItem, validateUpdateItem } from "./cart.types";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// GET /api/cart — return the user's active cart (get-or-create an empty one).
router.get("/", requireAuth, asyncHandler(getCartHandler));

// POST /api/cart/items — add a dish to the cart (or bump its quantity).
router.post(
  "/items",
  requireAuth,                       // must be logged in
  validate(validateAddItem),         // body → { menu_item_id, quantity }
  asyncHandler(addItemHandler)
);

// PATCH /api/cart/items/:menuItemId — set a line's quantity to an exact number.
router.patch(
  "/items/:menuItemId",
  requireAuth,
  validate(validateUpdateItem),      // body → { quantity }
  asyncHandler(updateItemHandler)
);

// DELETE /api/cart/items/:menuItemId — remove one line from the cart.
router.delete("/items/:menuItemId", requireAuth, asyncHandler(removeItemHandler));

// DELETE /api/cart — empty the whole cart.
router.delete("/", requireAuth, asyncHandler(clearCartHandler));

export { router as cartRoutes };
