// ─────────────────────────────────────────────────────────────
// user.controller.ts — HTTP layer for the users module.
// All routes here run AFTER requireAuth, so req.user is guaranteed set. Handlers
// read the caller's id from req.user.sub (the JWT), never from the URL/body —
// that's what stops user A from editing user B's profile.
// ─────────────────────────────────────────────────────────────

import type { Request, Response } from "express";
import * as userService from "./user.service";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";

// GET /api/users/me — the caller's own profile.
export async function getMeHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const user = await userService.getProfile(req.user.sub);
  return sendSuccess(res, { user }, "Profile fetched");
}

// PATCH /api/users/me — update the caller's own name/phone.
export async function updateMeHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  // We pass the raw body; the service validates each field it recognizes.
  const user = await userService.updateProfile(req.user.sub, req.body ?? {});
  return sendSuccess(res, { user }, "Profile updated");
}

// GET /api/users — ADMIN only (guarded by requireRole in the route).
export async function listUsersHandler(_req: Request, res: Response) {
  const users = await userService.listUsers();
  return sendSuccess(res, { users, count: users.length }, "All users");
}
