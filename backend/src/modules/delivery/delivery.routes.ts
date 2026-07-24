// delivery.routes.ts — URLs for delivery, mounted at "/api/delivery".
//
// POST /assign                  — assign a partner to an order (OWNER / ADMIN)
// GET  /:orderId                — get assignment details (any authenticated user)
// PATCH /:orderId/status        — partner updates delivery status (DELIVERY)
// PATCH /:orderId/location      — partner pushes GPS position (DELIVERY)

import { Router } from "express";
import {
  assignPartnerHandler,
  getAssignmentHandler,
  updateStatusHandler,
  updateLocationHandler,
} from "./delivery.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { validateAssignPartner, validateUpdateStatus, validateUpdateLocation } from "./delivery.types";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

// Assign a delivery partner — only owners/admins can do this.
router.post(
  "/assign",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  validate(validateAssignPartner),
  asyncHandler(assignPartnerHandler)
);

// View an assignment — any authenticated user (customer checks their own order).
router.get("/:orderId", requireAuth, asyncHandler(getAssignmentHandler));

// Partner updates their status (ASSIGNED → PICKED_UP → DELIVERED).
router.patch(
  "/:orderId/status",
  requireAuth,
  requireRole("DELIVERY"),
  validate(validateUpdateStatus),
  asyncHandler(updateStatusHandler)
);

// Partner pushes a GPS ping.
router.patch(
  "/:orderId/location",
  requireAuth,
  requireRole("DELIVERY"),
  validate(validateUpdateLocation),
  asyncHandler(updateLocationHandler)
);

export { router as deliveryRoutes };
