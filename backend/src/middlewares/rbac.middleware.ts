import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import type { Role } from "../modules/auth/auth.types";

export function requireRole(...allowed: Role[]) {

  return (req: Request, _res: Response, next: NextFunction): void => {

    if (!req.user) {
      return next(ApiError.unauthorized("Authentication required"));
    }

    if (!allowed.includes(req.user.role)) {

      return next(ApiError.forbidden("You do not have permission to do this"));
    }
    return next();
  };
}
