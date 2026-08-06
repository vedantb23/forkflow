import { Router } from "express";
import {
  assignPartnerHandler,
  getAssignmentHandler,
  updateStatusHandler,
  updateLocationHandler,
  getAvailableDeliveriesHandler,
  claimDeliveryHandler,
} from "./delivery.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { validateAssignPartner, validateUpdateStatus, validateUpdateLocation } from "./delivery.types";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get(
  "/available",
  requireAuth,
  requireRole("DELIVERY"),
  asyncHandler(getAvailableDeliveriesHandler)
);

router.post(
  "/assign",
  requireAuth,
  requireRole("RESTAURANT_OWNER", "ADMIN"),
  validate(validateAssignPartner),
  asyncHandler(assignPartnerHandler)
);

router.get("/:orderId", requireAuth, asyncHandler(getAssignmentHandler));

router.patch(
  "/:orderId/status",
  requireAuth,
  requireRole("DELIVERY"),
  validate(validateUpdateStatus),
  asyncHandler(updateStatusHandler)
);

router.post(
  "/:orderId/claim",
  requireAuth,
  requireRole("DELIVERY"),
  asyncHandler(claimDeliveryHandler)
);

router.patch(
  "/:orderId/location",
  requireAuth,
  requireRole("DELIVERY"),
  validate(validateUpdateLocation),
  asyncHandler(updateLocationHandler)
);

export { router as deliveryRoutes };
