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

router.get("/:restaurantId", asyncHandler(listMenuHandler));

router.get(
  "/:restaurantId/owner",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  asyncHandler(listMenuForOwnerHandler)
);

router.post(
  "/:restaurantId",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  upload.single("image"),
  validate(validateCreateMenuItem),
  asyncHandler(createMenuItemHandler)
);

router.patch(
  "/items/:itemId",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  upload.single("image"),
  validate(validateUpdateMenuItem),
  asyncHandler(updateMenuItemHandler)
);

router.delete(
  "/items/:itemId",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  asyncHandler(deleteMenuItemHandler)
);

export { router as menuRoutes };
