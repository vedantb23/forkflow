import { Router } from "express";
import {
  getMeHandler,
  updateMeHandler,
  listUsersHandler,
} from "./user.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/me", requireAuth, asyncHandler(getMeHandler));

router.patch("/me", requireAuth, asyncHandler(updateMeHandler));

router.get("/", requireAuth, requireRole("ADMIN"), asyncHandler(listUsersHandler));

export { router as userRoutes };
