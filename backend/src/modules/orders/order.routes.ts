// order.routes.ts — URLs for orders, mounted at "/api/orders".
//
// POST  /                          — place a new order (customer-only; send Idempotency-Key header)
// GET   /                          — list the logged-in customer's orders
// GET   /restaurant/:restaurantId  — owner's live feed of a restaurant's orders (KDS)
// GET   /:orderId                  — get one order's details
// PATCH /:orderId/status           — owner advances an order's status

import { Router } from "express";
import {
  placeOrderHandler,
  getMyOrdersHandler,
  getOrderHandler,
  getRestaurantOrdersHandler,
  updateOrderStatusHandler,
} from "./order.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { validatePlaceOrder, validateUpdateOrderStatus } from "./order.types";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.post("/", requireAuth, validate(validatePlaceOrder), asyncHandler(placeOrderHandler));
router.get("/", requireAuth, asyncHandler(getMyOrdersHandler));

// Owner KDS feed. MUST come before "/:orderId" so "restaurant" isn't read as an id.
router.get(
  "/restaurant/:restaurantId",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  asyncHandler(getRestaurantOrdersHandler)
);

router.get("/:orderId", requireAuth, asyncHandler(getOrderHandler));

// Owner advances an order's status (Accept & Prep, Mark Ready, ...).
router.patch(
  "/:orderId/status",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  validate(validateUpdateOrderStatus),
  asyncHandler(updateOrderStatusHandler)
);

export { router as orderRoutes };
