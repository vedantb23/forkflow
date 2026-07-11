// ─────────────────────────────────────────────────────────────
// asyncHandler.ts — wrapper so async route handlers don't need try/catch.
// PROBLEM it solves: in Express, if an `async` handler throws (or a promise
// rejects), Express does NOT automatically forward it to the error middleware —
// the request just hangs. Normally you'd wrap every handler in try/catch and
// call next(err). That's repetitive. This helper does it once.
// ─────────────────────────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";

// The type of a normal async Express handler.
type AsyncFn = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

// asyncHandler takes your async function and returns a new function that
// automatically catches any rejection and forwards it to Express via next().
export function asyncHandler(fn: AsyncFn) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Promise.resolve(...) ensures we can .catch() even if fn returns non-promise.
    // Any thrown error / rejected promise → next(err) → error.middleware handles it.
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
