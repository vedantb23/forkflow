import { Router } from "express";
import {
  registerHandler,
  loginHandler,
  meHandler,
  logoutHandler,
  googleHandler,
} from "./auth.controller";
import { validate } from "../../middlewares/validate.middleware";
import { validateRegister, validateLogin } from "./auth.types";
import { requireAuth } from "../../middlewares/auth.middleware";
import { asyncHandler } from "../../utils/asyncHandler";

const router = Router();

router.post("/register", validate(validateRegister), asyncHandler(registerHandler));

router.post("/login", validate(validateLogin), asyncHandler(loginHandler));

router.post("/google", asyncHandler(googleHandler));

router.get("/me", requireAuth, asyncHandler(meHandler));

router.post("/logout", asyncHandler(logoutHandler));

export { router as authRoutes };
