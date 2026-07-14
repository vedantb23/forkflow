// ─────────────────────────────────────────────────────────────
// auth.controller.ts — the HTTP layer for auth.
// A controller's ONLY job: read the request, call a service function, and shape
// the HTTP response (status + JSON + cookie). No business logic lives here.
// Every handler is wrapped by asyncHandler at the route layer, so we can throw
// freely and the error middleware formats the response.
// ─────────────────────────────────────────────────────────────

import type { Request, Response } from "express";
import * as authService from "./auth.service"; // register/login/getById
import type { RegisterInput, LoginInput } from "./auth.types"; // clean input shapes
import { sendSuccess } from "../../utils/apiResponse"; // standard { success, message, data }
import { ApiError } from "../../utils/apiError";
import { env } from "../../config/env";

// Step 1 — a small helper to drop the JWT into an httpOnly cookie.
// WHY a cookie AND also returning the token in the body?
//  • httpOnly cookie: JavaScript can't read it → safe from XSS token theft. The
//    browser sends it automatically on same-site requests. Great for the web app.
//  • token in body: handy for Postman / mobile / any non-browser client that
//    sends it back as an "Authorization: Bearer <token>" header.
// Our auth.middleware will accept EITHER, so both flows work.
function setAuthCookie(res: Response, token: string): void {
  res.cookie("token", token, {
    httpOnly: true, // not readable by client-side JS (XSS protection)
    secure: env.NODE_ENV === "production", // HTTPS-only in prod; allow http on localhost
    sameSite: "lax", // sent on top-level navigations; blocks most CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds (matches JWT expiry)
  });
}

// Step 2 — POST /auth/register
export async function registerHandler(req: Request, res: Response) {
  // req.body was already validated + cleaned by validate(validateRegister) in the
  // route, so we can trust its shape here.
  const input = req.body as RegisterInput;
  // Do the work.
  const { user, token } = await authService.register(input);
  // Set the cookie for browser clients, and return token+user for everyone else.
  setAuthCookie(res, token);
  // 201 Created — a new resource (the user) was made.
  return sendSuccess(res, { user, token }, "Registered successfully", 201);
}

// Step 3 — POST /auth/login
export async function loginHandler(req: Request, res: Response) {
  const input = req.body as LoginInput; // already validated by validate(validateLogin)
  const { user, token } = await authService.login(input);
  setAuthCookie(res, token);
  return sendSuccess(res, { user, token }, "Logged in successfully");
}

// Step 4 — GET /auth/me  (protected — auth.middleware runs first)
export async function meHandler(req: Request, res: Response) {
  // auth.middleware guarantees req.user is set by the time we get here. If it
  // somehow isn't, that's a programming error, not a user error → 401 is safe.
  if (!req.user) {
    throw ApiError.unauthorized("Not authenticated");
  }
  // req.user.sub is the user id we baked into the JWT.
  const user = await authService.getById(req.user.sub);
  return sendSuccess(res, { user }, "Current user");
}

// Step 5 — POST /auth/logout — clear the cookie. (Stateless JWTs can't be
// "revoked" server-side without a blocklist, so logout = drop the client's cookie.)
export async function logoutHandler(_req: Request, res: Response) {
  res.clearCookie("token");
  return sendSuccess(res, null, "Logged out");
}
