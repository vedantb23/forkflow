// ─────────────────────────────────────────────────────────────
// user.service.ts — profile logic for the logged-in user + admin listing.
// Auth (register/login) lives in the auth module; this module is about MANAGING
// a user record afterwards: view my profile, update my profile, and (admin) list
// everyone. DB access via our query() helper; no Express here.
// ─────────────────────────────────────────────────────────────

import { query } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import type { PublicUser, Role } from "../auth/auth.types";

// The full DB row (internal). We never return password_hash / google_id outward.
interface UserRow {
  id: string;
  email: string;
  password_hash: string | null;
  name: string;
  phone: string | null;
  role: Role;
  google_id: string | null;
  created_at: string;
}

// Strip secret columns → the client-safe shape (same idea as in auth.service).
function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    role: row.role,
    created_at: row.created_at,
  };
}

// What a profile update may change. Only name + phone for now — NOT email/role
// (changing those has security implications we don't want a self-service route to allow).
export interface UpdateProfileInput {
  name?: string;
  phone?: string;
}

// Step 1 — get one user's profile by id.
export async function getProfile(userId: string): Promise<PublicUser> {
  const rows = await query<UserRow>("SELECT * FROM users WHERE id = $1", [userId]);
  if (rows.length === 0) {
    throw ApiError.notFound("User not found");
  }
  return toPublicUser(rows[0]);
}

// Step 2 — update the caller's own name/phone.
// We build the SET clause dynamically so we only touch the fields actually sent.
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<PublicUser> {
  // Collect "column = $n" fragments and their matching values in lockstep.
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1; // Postgres placeholders are 1-based: $1, $2, ...

  if (input.name !== undefined) {
    if (typeof input.name !== "string" || input.name.trim() === "") {
      throw ApiError.badRequest("Name must be a non-empty string");
    }
    sets.push(`name = $${i++}`);
    values.push(input.name.trim());
  }
  if (input.phone !== undefined) {
    if (typeof input.phone !== "string") {
      throw ApiError.badRequest("Phone must be a string");
    }
    sets.push(`phone = $${i++}`);
    values.push(input.phone.trim());
  }

  // Nothing valid to update → tell the caller instead of running an empty UPDATE.
  if (sets.length === 0) {
    throw ApiError.badRequest("Provide at least one field to update (name, phone)");
  }

  // The user id is the LAST parameter, used in the WHERE clause.
  values.push(userId);
  const rows = await query<UserRow>(
    `UPDATE users SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
    values
  );
  if (rows.length === 0) {
    throw ApiError.notFound("User not found");
  }
  return toPublicUser(rows[0]);
}

// Step 3 — admin-only: list all users (newest first). RBAC is enforced at the
// route; by the time we're here the caller is already known to be an ADMIN.
export async function listUsers(): Promise<PublicUser[]> {
  const rows = await query<UserRow>(
    "SELECT * FROM users ORDER BY created_at DESC"
  );
  return rows.map(toPublicUser);
}
