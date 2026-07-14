// ─────────────────────────────────────────────────────────────
// auth.middleware.ts — the gatekeeper for protected routes.
// It runs BEFORE a protected handler. Its job: find the JWT (from the
// Authorization header OR the cookie), verify it, and attach the decoded payload
// to req.user. If there's no valid token, it rejects with 401 and the handler
// never runs.
// ─────────────────────────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../modules/auth/auth.service"; // checks signature+expiry
import { ApiError } from "../utils/apiError";

// Step 1 — pull the raw token out of the request, wherever it may be.
// Priority: "Authorization: Bearer <token>" header first (Postman/mobile), then
// the httpOnly "token" cookie (browser). Returns null if neither is present.
function extractToken(req: Request): string | null {
  // 1a) Header form: "Bearer eyJhbGc...". Split off the scheme, keep the token.
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  // 1b) Cookie form: set by setAuthCookie in the controller.
  if (req.cookies && typeof req.cookies.token === "string") {
    return req.cookies.token;
  }
  // 1c) Nothing found.
  return null;
}

// Step 2 — the middleware itself. Express calls it with (req, res, next).
// On success we call next() to continue to the handler; on failure we call
// next(err) so the error middleware sends the 401.
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    // No credentials at all → 401 Unauthorized.
    return next(ApiError.unauthorized("Authentication required,token issue"));
  }
  try {
    // verifyToken throws ApiError.unauthorized on bad/expired tokens.
    const payload = verifyToken(token);
    // Attach the identity so downstream handlers/rbac can read it.
    req.user = payload;
    return next(); // all good — proceed to the route handler
  } catch (err) {
    return next(err); // forward the 401 to the error middleware
  }
}
