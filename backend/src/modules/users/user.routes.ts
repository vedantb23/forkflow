import { Router } from "express";
import {
  getMeHandler,
  updateMeHandler,
  listUsersHandler,
  updateUserRoleHandler,
  deleteUserHandler,
} from "./user.controller";
import { requireAuth } from "../../middlewares/auth.middleware";
import { requireRole } from "../../middlewares/rbac.middleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.get("/me", requireAuth, asyncHandler(getMeHandler));

router.patch("/me", requireAuth, asyncHandler(updateMeHandler));

router.get("/", requireAuth, requireRole("ADMIN"), asyncHandler(listUsersHandler));

router.patch("/:userId/role", requireAuth, requireRole("ADMIN"), asyncHandler(updateUserRoleHandler));

router.delete("/:userId", requireAuth, requireRole("ADMIN"), asyncHandler(deleteUserHandler));

export { router as userRoutes };
