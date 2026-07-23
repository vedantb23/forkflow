// order.routes.ts — URLs for orders, mounted at "/api/orders".
//
// POST /          — place a new order (customer-only; send Idempotency-Key header)
// GET  /          — list the logged-in customer's orders
// GET  /:orderId  — get one order's details

import { Router } from "express";
import { placeOrderHandler, getMyOrdersHandler, getOrderHandler } from "./order.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { validatePlaceOrder } from "./order.types";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.post("/", requireAuth, validate(validatePlaceOrder), asyncHandler(placeOrderHandler));
router.get("/", requireAuth, asyncHandler(getMyOrdersHandler));
router.get("/:orderId", requireAuth, asyncHandler(getOrderHandler));

export { router as orderRoutes };
