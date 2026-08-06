import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../modules/auth/auth.service";
import { ApiError } from "../utils/apiError";

function extractToken(req: Request): string | null {

  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }

  if (req.cookies && typeof req.cookies.token === "string") {
    return req.cookies.token;
  }

  return null;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {

    return next(ApiError.unauthorized("Authentication required,token issue"));
  }
  try {

    const payload = verifyToken(token);

    req.user = payload;
    return next();
  } catch (err) {
    return next(err);
  }
}
