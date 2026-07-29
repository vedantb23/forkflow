// ─────────────────────────────────────────────────────────────
// apiError.ts — one custom Error type for "expected" API failures.
// WHY: we want to throw errors that already know their HTTP status code
// (e.g. 404 Not Found, 403 Forbidden). Then a single error middleware can read
// that status and respond correctly — instead of every route handling it.
// ─────────────────────────────────────────────────────────────

// Step 1 — extend the built-in Error class with an HTTP statusCode.
export class ApiError extends Error {
  public readonly statusCode: number; // the HTTP status to send (e.g. 404)
  public readonly isOperational: boolean; // true = an expected error we handle gracefully

  // The constructor runs when we do `new ApiError(404, "Not found")`.
  constructor(statusCode: number, message: string, isOperational = true) {
    super(message); // pass the message to the base Error class
    this.statusCode = statusCode; // remember the status code on the instance
    this.isOperational = isOperational; // distinguish our errors from unexpected crashes
    // Fixes prototype chain so `instanceof ApiError` works after TS compiles down.
    Object.setPrototypeOf(this, ApiError.prototype);
    // Capture a clean stack trace (omits this constructor from the trace).
    Error.captureStackTrace(this, this.constructor);
  }

  // ---- Convenience factories so calling code reads nicely ----
  // Instead of `new ApiError(400, msg)`, you can write `ApiError.badRequest(msg)`.
  static badRequest(message = "Bad request") {
    return new ApiError(400, message);
  }
  static unauthorized(message = "Unauthorized") {
    return new ApiError(401, message);
  }
  static forbidden(message = "Forbidden") {
    return new ApiError(403, message);
  }
  static notFound(message = "Not found") {
    return new ApiError(404, message);
  }
  static conflict(message = "Conflict") {
    return new ApiError(409, message);
  }
  // 500 = the server broke or is misconfigured (not the client's fault).
  // isOperational stays true: it's an error we anticipated and format cleanly.
  static internal(message = "Internal server error") {
    return new ApiError(500, message);
  }
}
