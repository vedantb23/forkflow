// ─────────────────────────────────────────────────────────────
// apiResponse.ts — one consistent success-response shape for the whole API.
// WHY: every endpoint returning a different JSON shape makes the frontend messy.
// We standardize on { success, message, data } so the client always knows where
// to look.
// ─────────────────────────────────────────────────────────────

import type { Response } from "express"; // the Express response object type

// A tiny helper that writes a standard success JSON response.
// Generic <T> = the type of whatever `data` we're sending back.
export function sendSuccess<T>(
  res: Response, // the Express response to write to
  data: T, // the payload (a user, a list, etc.)
  message = "Success", // a human-readable message
  statusCode = 200 // HTTP status (200 OK by default)
) {
  // res.status(...).json(...) sets the status code and sends JSON in one go.
  return res.status(statusCode).json({
    success: true, // always true here — this is the success helper
    message, // e.g. "Order placed"
    data, // the actual content
  });
}
