// ─────────────────────────────────────────────────────────────
// auth.types.ts — the shapes of auth data + hand-written validators.
// WHY no validation library (like zod)? To SEE exactly what validation is:
// "is this field present, a string, the right length". A library hides that.
// Each validator takes the raw req.body (typed `unknown` — we trust nothing),
// checks it, and either returns a clean typed object or throws ApiError.badRequest.
// ─────────────────────────────────────────────────────────────

import { ApiError } from "../../utils/apiError"; // thrown when a payload is invalid

// Step 1 — the roles a user can have. Mirrors the `role` enum in schema.sql.
// We keep it as a TS union so the compiler stops us using an invalid role string.
export type Role = "CUSTOMER" | "RESTAURANT_OWNER" | "DELIVERY" | "ADMIN";

// Step 2 — what a registration request must contain (after validation).
export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string; // optional — user can add it later
  role?: Role; // optional — defaults to CUSTOMER in the service
}

// Step 3 — what a login request must contain.
export interface LoginInput {
  email: string;
  password: string;
}

// Step 4 — the "safe" user we send back to clients. NOTE: no password_hash.
// This is the row from the DB minus the secret column. Every API response about
// a user uses this shape so we never leak the hash by accident.
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  created_at: string;
}

// Step 5 — the payload we put INSIDE a JWT. Small on purpose: just enough to
// identify the caller (id) and authorize them (role). Everything else we look
// up from the DB when needed.
export interface JwtPayload {
  sub: string; // "subject" = the user id (standard JWT claim name)
  role: Role;
}

// ---- helpers used by the validators below ----

// A quick "is this a non-empty string?" guard. Returns true only for real text.
function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

// The four roles as a runtime array, so we can check an incoming string against it.
const VALID_ROLES: Role[] = ["CUSTOMER", "RESTAURANT_OWNER", "DELIVERY", "ADMIN"];

// Step 6 — validateRegister: turn untrusted req.body into a clean RegisterInput.
// It throws ApiError.badRequest(...) the moment something is wrong, so the route
// never sees a half-valid object.
export function validateRegister(body: unknown): RegisterInput {
  // body must be an object at all (not null, not a string, not an array).
  if (typeof body !== "object" || body === null) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  // Cast to a record so we can read fields; each field is still `unknown`.
  const b = body as Record<string, unknown>;

  // email — required, must look at least vaguely like an email (has "@" and ".").
  if (!isNonEmptyString(b.email) || !b.email.includes("@") || !b.email.includes(".")) {
    throw ApiError.badRequest("A valid email is required");
  }
  // password — required, minimum 6 chars so we don't store trivially weak ones.
  if (!isNonEmptyString(b.password) || b.password.length < 6) {
    throw ApiError.badRequest("Password must be at least 6 characters");
  }
  // name — required.
  if (!isNonEmptyString(b.name)) {
    throw ApiError.badRequest("Name is required");
  }
  // phone — OPTIONAL, but if present it must be a string.
  if (b.phone !== undefined && typeof b.phone !== "string") {
    throw ApiError.badRequest("Phone must be a string");
  }
  // role — OPTIONAL, but if present it must be one of the four valid roles.
  if (b.role !== undefined && !VALID_ROLES.includes(b.role as Role)) {
    throw ApiError.badRequest(`Role must be one of: ${VALID_ROLES.join(", ")}`);
  }

  // All checks passed — return a clean, typed, trimmed object.
  return {
    email: b.email.trim().toLowerCase(), // normalize so "A@x.com" == "a@x.com"
    password: b.password, // never trim/alter a password
    name: b.name.trim(),
    phone: b.phone as string | undefined,
    role: b.role as Role | undefined,
  };
}

// Step 7 — validateLogin: same idea, fewer fields.
export function validateLogin(body: unknown): LoginInput {
  if (typeof body !== "object" || body === null) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }
  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.email)) {
    throw ApiError.badRequest("Email is required");
  }
  if (!isNonEmptyString(b.password)) {
    throw ApiError.badRequest("Password is required");
  }

  return {
    email: b.email.trim().toLowerCase(),
    password: b.password,
  };
}
