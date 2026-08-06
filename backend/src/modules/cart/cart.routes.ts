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

router.get("/", requireAuth, asyncHandler(getCartHandler));

router.post(
  "/items",
  requireAuth,
  validate(validateAddItem),
  asyncHandler(addItemHandler)
);

router.patch(
  "/items/:menuItemId",
  requireAuth,
  validate(validateUpdateItem),
  asyncHandler(updateItemHandler)
);

router.delete("/items/:menuItemId", requireAuth, asyncHandler(removeItemHandler));

router.delete("/", requireAuth, asyncHandler(clearCartHandler));

export { router as cartRoutes };
