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

router.get(
  "/restaurant/:restaurantId",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  asyncHandler(getRestaurantOrdersHandler)
);

router.get("/:orderId", requireAuth, asyncHandler(getOrderHandler));

router.patch(
  "/:orderId/status",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  validate(validateUpdateOrderStatus),
  asyncHandler(updateOrderStatusHandler)
);

export { router as orderRoutes };
