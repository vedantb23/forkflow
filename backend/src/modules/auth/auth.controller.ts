import type { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import * as authService from "./auth.service";
import type { RegisterInput, LoginInput } from "./auth.types";
import { sendSuccess } from "../../utils/apiResponse";
import { ApiError } from "../../utils/apiError";
import { env } from "../../config/env";

const googleClient = env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(env.GOOGLE_CLIENT_ID)
  : null;

function setAuthCookie(res: Response, token: string): void {
  res.cookie("token", token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export async function registerHandler(req: Request, res: Response) {

  const input = req.body as RegisterInput;

  const { user, token } = await authService.register(input);

  setAuthCookie(res, token);

  return sendSuccess(res, { user, token }, "Registered successfully", 201);
}

export async function loginHandler(req: Request, res: Response) {
  const input = req.body as LoginInput;
  const { user, token } = await authService.login(input);
  setAuthCookie(res, token);
  return sendSuccess(res, { user, token }, "Logged in successfully");
}

export async function meHandler(req: Request, res: Response) {

  if (!req.user) {
    throw ApiError.unauthorized("Not authenticated");
  }

  const user = await authService.getById(req.user.sub);
  return sendSuccess(res, { user }, "Current user");
}

export async function logoutHandler(_req: Request, res: Response) {
  res.clearCookie("token");
  return sendSuccess(res, null, "Logged out");
}

export async function googleHandler(req: Request, res: Response) {

  if (!googleClient || !env.GOOGLE_CLIENT_ID) {
    throw ApiError.internal("Google sign-in is not configured on the server");
  }

  const credential = (req.body as { credential?: unknown }).credential;
  if (typeof credential !== "string" || credential.trim() === "") {
    throw ApiError.badRequest("Missing Google credential");
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw ApiError.unauthorized("Invalid Google credential");
  }

  if (!payload || !payload.sub || !payload.email || !payload.email_verified) {
    throw ApiError.unauthorized("Google account is missing a verified email");
  }

  const { user, token } = await authService.loginWithGoogle({
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
  });

  setAuthCookie(res, token);
  return sendSuccess(res, { user, token }, "Logged in with Google");
}
