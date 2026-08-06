import { ApiError } from "../../utils/apiError";

export type Role = "CUSTOMER" | "RESTAURANT_OWNER" | "DELIVERY" | "ADMIN";

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role?: Role;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: Role;
  created_at: string;
}

export interface JwtPayload {
  sub: string;
  role: Role;
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

const VALID_ROLES: Role[] = ["CUSTOMER", "RESTAURANT_OWNER", "DELIVERY", "ADMIN"];

export function validateRegister(body: unknown): RegisterInput {

  if (typeof body !== "object" || body === null) {
    throw ApiError.badRequest("Request body must be a JSON object");
  }

  const b = body as Record<string, unknown>;

  if (!isNonEmptyString(b.email) || !b.email.includes("@") || !b.email.includes(".")) {
    throw ApiError.badRequest("A valid email is required");
  }

  if (!isNonEmptyString(b.password) || b.password.length < 6) {
    throw ApiError.badRequest("Password must be at least 6 characters");
  }

  if (!isNonEmptyString(b.name)) {
    throw ApiError.badRequest("Name is required");
  }

  if (b.phone !== undefined && typeof b.phone !== "string") {
    throw ApiError.badRequest("Phone must be a string");
  }

  if (b.role !== undefined && !VALID_ROLES.includes(b.role as Role)) {
    throw ApiError.badRequest(`Role must be one of: ${VALID_ROLES.join(", ")}`);
  }

  return {
    email: b.email.trim().toLowerCase(),
    password: b.password,
    name: b.name.trim(),
    phone: b.phone as string | undefined,
    role: b.role as Role | undefined,
  };
}

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
