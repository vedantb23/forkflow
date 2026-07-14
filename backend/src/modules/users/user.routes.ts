// ─────────────────────────────────────────────────────────────
// user.routes.ts — URLs for the users module, mounted at "/api/users".
// EVERY route here is protected. Notice the two levels of protection:
//   requireAuth              → must be logged in (any role)
//   requireRole("ADMIN")     → must additionally be an ADMIN
// This is exactly the RBAC check the Day-2 verify step exercises (a CUSTOMER
// hitting GET /api/users must get 403).
// ─────────────────────────────────────────────────────────────

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

// GET /api/users/me — any authenticated user can view their own profile.
router.get("/me", requireAuth, asyncHandler(getMeHandler));

// PATCH /api/users/me — any authenticated user can update their own profile.
router.patch("/me", requireAuth, asyncHandler(updateMeHandler));

// GET /api/users — ADMIN only. requireAuth first (sets req.user), then requireRole.
router.get("/", requireAuth, requireRole("ADMIN"), asyncHandler(listUsersHandler));

export { router as userRoutes };
