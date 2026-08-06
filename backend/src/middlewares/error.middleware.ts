import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";
import { logger } from "../config/logger";

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {

  let statusCode = 500;
  let message = "Internal server error";

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof Error) {
    message = err.message;
  }

  logger.error({ err }, "Request failed");

  res.status(statusCode).json({
    success: false,
    message,
    data: null,
  });
}
