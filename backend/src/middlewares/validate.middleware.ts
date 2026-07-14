// ─────────────────────────────────────────────────────────────
// validate.middleware.ts — a reusable "run a validator before the handler" wrapper.
// Our validators (e.g. validateRegister in auth.types) take an untrusted body and
// return a CLEAN typed object, or throw ApiError.badRequest. This middleware runs
// one of them, and on success replaces req.body with the cleaned value so the
// controller receives trusted, normalized data. On failure it forwards the 400.
//
// WHY a factory? So any module can reuse it:
//   router.post("/register", validate(validateRegister), registerHandler)
//   router.post("/login",    validate(validateLogin),    loginHandler)
// ─────────────────────────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";

// A Validator is any function that takes the raw body (unknown) and either
// returns a clean value of type T or throws. This matches validateRegister/Login.
type Validator<T> = (body: unknown) => T;

// validate(validator) → an Express middleware bound to that validator.
export function validate<T>(validator: Validator<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Run the validator on the raw body. Throws ApiError.badRequest if invalid.
      const clean = validator(req.body);
      // Overwrite req.body with the cleaned/normalized value (e.g. lowercased
      // email, trimmed name) so the controller works with trusted data.
      req.body = clean;
      return next();
    } catch (err) {
      // Validation failed → forward the ApiError to the error middleware (400).
      return next(err);
    }
  };
}
