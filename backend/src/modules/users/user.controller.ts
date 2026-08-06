import type { Request, Response } from "express";
import * as userService from "./user.service";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";

export async function getMeHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");
  const user = await userService.getProfile(req.user.sub);
  return sendSuccess(res, { user }, "Profile fetched");
}

export async function updateMeHandler(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized("Not authenticated");

  const user = await userService.updateProfile(req.user.sub, req.body ?? {});
  return sendSuccess(res, { user }, "Profile updated");
}

export async function listUsersHandler(_req: Request, res: Response) {
  const users = await userService.listUsers();
  return sendSuccess(res, { users, count: users.length }, "All users");
}
