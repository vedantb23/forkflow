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

export async function updateUserRoleHandler(req: Request, res: Response) {
  const { userId } = req.params;
  const { role } = req.body;
  if (!role) throw ApiError.badRequest("role is required");
  const user = await userService.updateUserRole(userId as string, role);
  return sendSuccess(res, { user }, "User role updated");
}

export async function deleteUserHandler(req: Request, res: Response) {
  const { userId } = req.params;
  await userService.deleteUser(userId as string);
  return sendSuccess(res, null, "User deleted");
}
