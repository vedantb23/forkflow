// ─────────────────────────────────────────────────────────────
// error.middleware.ts — the ONE place every error ends up.
// WHY: instead of each route formatting its own error response, everything that
// throws (thanks to asyncHandler) lands here. We decide the status code and the
// JSON shape once, log the error, and reply consistently.
// HOW: Express recognizes a middleware with FOUR args (err, req, res, next) as
// an error handler. It must be registered LAST, after all routes (see app.ts).
// ─────────────────────────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError"; // our custom error type
import { logger } from "../config/logger"; // shared logger

// The 4-argument signature is what marks this as an error-handling middleware.
export function errorMiddleware(
  err: unknown, // whatever was thrown (could be anything)
  _req: Request, // underscore = intentionally unused (Express still needs the slot)
  res: Response,
  _next: NextFunction
) {
  // Step 1 — figure out the status code and message.
  // If it's OUR ApiError, we trust its statusCode. Otherwise it's an unexpected
  // crash → treat as 500 Internal Server Error and hide details from the client.
  let statusCode = 500;
  let message = "Internal server error";

  if (err instanceof ApiError) {
    statusCode = err.statusCode; // e.g. 404, 403
    message = err.message; // safe, human-readable message we set
  } else if (err instanceof Error) {
    message = err.message; // for now surface the message; refine per-env later
  }

  // Step 2 — log the error so we can debug (full error server-side only).
  logger.error({ err }, "Request failed");

  // Step 3 — send a consistent error JSON shape (mirrors sendSuccess).
  res.status(statusCode).json({
    success: false, // always false in the error path
    message, // what went wrong
    data: null, // no data on errors
  });
}
