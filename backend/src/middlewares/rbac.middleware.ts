// ─────────────────────────────────────────────────────────────
// rbac.middleware.ts — Role-Based Access Control.
// requireAuth proves WHO you are. requireRole proves you're ALLOWED here.
// Example: only a RESTAURANT_OWNER may create a restaurant; only an ADMIN may
// list all users. This factory returns a middleware locked to the roles you pass.
//
// IMPORTANT: always chain it AFTER requireAuth, e.g.
//   router.get("/admin", requireAuth, requireRole("ADMIN"), handler)
// because it reads req.user, which requireAuth sets.
// ─────────────────────────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import type { Role } from "../modules/auth/auth.types";

// requireRole is a FACTORY: you call it with the allowed roles and it hands back
// a middleware. `...allowed` collects them into an array, so all of these work:
//   requireRole("ADMIN")
//   requireRole("ADMIN", "RESTAURANT_OWNER")
export function requireRole(...allowed: Role[]) {
  // The returned function is the actual Express middleware.
  return (req: Request, _res: Response, next: NextFunction): void => {
    // Must be authenticated first (requireAuth should have set req.user).
    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }
    // Is the caller's role in the allowed list?
    if (!allowed.includes(req.user.role)) {
      // Authenticated but not permitted → 403 Forbidden (NOT 401).
      return next(ApiError.forbidden("You do not have permission to do this"));
    }
    return next(); // role is allowed — proceed
  };
}
