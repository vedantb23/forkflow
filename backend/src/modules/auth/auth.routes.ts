// ─────────────────────────────────────────────────────────────
// auth.routes.ts — maps auth URLs to their handlers + the middleware chain.
// A "router" is a mini Express app for one feature area. We build it here and
// mount it at "/api/auth" in app.ts, so these paths become /api/auth/register etc.
//
// Read each line as a pipeline, left → right:
//   validate(...)  → cleans/validates the body (400 on bad input)
//   requireAuth    → verifies the JWT (401 if missing/invalid)
//   asyncHandler(handler) → runs the controller, forwarding errors to the error mw
// ─────────────────────────────────────────────────────────────

import { Router } from "express";
import {
  registerHandler,
  loginHandler,
  meHandler,
  logoutHandler,
} from "./auth.controller";
import { validate } from "../../middlewares/validate.middleware";
import { validateRegister, validateLogin } from "./auth.types";
import { requireAuth } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";

// Create the router for this module.
const router = Router();

// POST /api/auth/register — validate body, then create the user.
router.post("/register", validate(validateRegister), asyncHandler(registerHandler));

// POST /api/auth/login — validate body, then authenticate.
router.post("/login", validate(validateLogin), asyncHandler(loginHandler));


// GET /api/auth/me — PROTECTED: must be logged in. requireAuth sets req.user.
router.get("/me", requireAuth, asyncHandler(meHandler));

// POST /api/auth/logout — clear the auth cookie. (Safe to call even if the
// caller has no valid token, so it isn't gated by requireAuth.)
router.post("/logout", asyncHandler(logoutHandler));

// Export so app.ts can mount it.
export { router as authRoutes };
