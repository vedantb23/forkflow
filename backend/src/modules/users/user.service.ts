import { query } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import type { PublicUser, Role } from "../auth/auth.types";

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

export interface UpdateProfileInput {
  name?: string;
  phone?: string;
}

export async function getProfile(userId: string): Promise<PublicUser> {
  const rows = await query<UserRow>("SELECT * FROM users WHERE id = $1", [userId]);
  if (rows.length === 0) {
    throw ApiError.notFound("User not found");
  }
  return toPublicUser(rows[0]);
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<PublicUser> {

  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;

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

  if (sets.length === 0) {
    throw ApiError.badRequest("Provide at least one field to update (name, phone)");
  }

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

export async function listUsers(): Promise<PublicUser[]> {
  const rows = await query<UserRow>(
    "SELECT * FROM users ORDER BY created_at DESC"
  );
  return rows.map(toPublicUser);
}
