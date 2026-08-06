import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../../config/db";
import { env } from "../../config/env";
import { ApiError } from "../../utils/apiError";
import type {
  RegisterInput,
  LoginInput,
  PublicUser,
  Role,
  JwtPayload,
} from "./auth.types";

const SALT_ROUNDS = 10;
const JWT_EXPIRES_IN = "7d";

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

export function issueToken(user: Pick<UserRow, "id" | "role">): string {
  const payload: JwtPayload = { sub: user.id, role: user.role };

  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  try {

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {

    throw ApiError.unauthorized("Invalid or expired token");
  }
}

export async function register(
  input: RegisterInput
): Promise<{ user: PublicUser; token: string }> {

  const existing = await query<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [input.email]
  );
  if (existing.length > 0) {
    throw ApiError.conflict("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  const rows = await query<UserRow>(
    `INSERT INTO users (email, password_hash, name, phone, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.email,
      passwordHash,
      input.name,
      input.phone ?? null,
      input.role ?? "CUSTOMER",
    ]
  );
  const user = rows[0];

  const token = issueToken(user);
  return { user: toPublicUser(user), token };
}

export async function login(
  input: LoginInput
): Promise<{ user: PublicUser; token: string }> {

  const rows = await query<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [input.email]
  );
  const user = rows[0];

  if (!user || !user.password_hash) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const token = issueToken(user);
  return { user: toPublicUser(user), token };
}

export async function getById(userId: string): Promise<PublicUser> {
  const rows = await query<UserRow>("SELECT * FROM users WHERE id = $1", [userId]);
  if (rows.length === 0) {

    throw ApiError.unauthorized("User no longer exists");
  }
  return toPublicUser(rows[0]);
}

export async function loginWithGoogle(profile: {
  googleId: string;
  email: string;
  name: string;
}): Promise<{ user: PublicUser; token: string }> {

  const existing = await query<UserRow>(
    "SELECT * FROM users WHERE google_id = $1 OR email = $2",
    [profile.googleId, profile.email.toLowerCase()]
  );

  let user: UserRow;
  if (existing.length > 0) {

    user = existing[0];
    if (!user.google_id) {
      const updated = await query<UserRow>(
        "UPDATE users SET google_id = $1 WHERE id = $2 RETURNING *",
        [profile.googleId, user.id]
      );
      user = updated[0];
    }
  } else {

    const created = await query<UserRow>(
      `INSERT INTO users (email, name, google_id, role)
       VALUES ($1, $2, $3, 'CUSTOMER')
       RETURNING *`,
      [profile.email.toLowerCase(), profile.name, profile.googleId]
    );
    user = created[0];
  }

  const token = issueToken(user);
  return { user: toPublicUser(user), token };
}
