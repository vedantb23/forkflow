// menu.routes.ts — URLs for menu items, mounted at "/api/menu".
//
// Route design rationale:
//   GET    /:restaurantId         — public menu for diners (cached)
//   GET    /:restaurantId/owner   — owner's full menu (includes unavailable)
//   POST   /:restaurantId         — create item under restaurant (owner only)
//   PATCH  /items/:itemId         — update an item (owner only)
//   DELETE /items/:itemId         — delete an item (owner only)
//
// Why /items/:itemId for update/delete instead of /:restaurantId/:itemId?
// Because an item ID is globally unique — the service already knows which
// restaurant it belongs to via the DB row. Cleaner URLs, same security.
//
// Middleware order on writes (same as restaurant routes):
//   requireAuth → requireRole → upload.single("image") → validate → handler
// upload runs BEFORE validate because multer parses multipart bodies —
// until it runs, req.body is empty for form-data requests.

import { Router } from "express";
import {
  listMenuHandler,
  listMenuForOwnerHandler,
  createMenuItemHandler,
  updateMenuItemHandler,
  deleteMenuItemHandler,
} from "./menu.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";
import { upload } from "../../middlewares/upload.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { validateCreateMenuItem, validateUpdateMenuItem } from "./menu.types";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// GET /api/menu/:restaurantId — public list (diners browsing a restaurant).
// This is the most-hit menu endpoint. Goes through cache-aside in the service.
router.get("/:restaurantId", asyncHandler(listMenuHandler));

// GET /api/menu/:restaurantId/owner — owner's full list (dashboard view).
// MUST come before any "/:restaurantId/:something" patterns to avoid conflicts.
router.get(
  "/:restaurantId/owner",
  requireAuth,                                    // must be logged in
  requireRole("RESTAURANT_OWNER", "ADMIN"),       // must be an owner or admin
  asyncHandler(listMenuForOwnerHandler)
);

// POST /api/menu/:restaurantId — create a dish under a restaurant (owner only).
// Accepts optional image file under field "image".
router.post(
  "/:restaurantId",
  requireAuth,                                    // must be logged in
  requireRole("RESTAURANT_OWNER", "ADMIN"),       // must be an owner or admin
  upload.single("image"),                         // parse multipart; file → req.file
  validate(validateCreateMenuItem),               // validate req.body fields
  asyncHandler(createMenuItemHandler)
);

// PATCH /api/menu/items/:itemId — update a dish (owner only).
// Ownership checked transitively in the service via SQL join.
router.patch(
  "/items/:itemId",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  upload.single("image"),                         // optional new image
  validate(validateUpdateMenuItem),               // validate update fields
  asyncHandler(updateMenuItemHandler)
);

// DELETE /api/menu/items/:itemId — delete a dish (owner only).
router.delete(
  "/items/:itemId",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  asyncHandler(deleteMenuItemHandler)
);

export { router as menuRoutes };
