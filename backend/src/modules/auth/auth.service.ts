// ─────────────────────────────────────────────────────────────
// auth.service.ts — the actual auth LOGIC (no Express here on purpose).
// A "service" holds business rules and DB access. Controllers (next file) just
// call these functions and shape the HTTP response. Keeping logic out of
// controllers makes it testable and reusable (e.g. a worker could call login too).
//
// Concepts you'll use here:
//  • bcrypt — a slow, salted HASH for passwords. We never store the real password;
//    we store its hash. On login we re-hash the attempt and compare. Slow = good,
//    because it makes brute-forcing stolen hashes expensive.
//  • JWT (JSON Web Token) — a signed string the client keeps and sends back on
//    every request to prove "I already logged in". Signed with JWT_SECRET so nobody
//    can forge one. It is NOT encrypted — never put secrets inside it.
// ─────────────────────────────────────────────────────────────

// Step 1 — imports.
import bcrypt from "bcryptjs"; // password hashing + comparison
import jwt from "jsonwebtoken"; // sign / verify JWTs
import { query } from "../../config/db"; // our pg query() helper (returns rows[])
import { env } from "../../config/env"; // validated env (JWT_SECRET)
import { ApiError } from "../../utils/apiError"; // typed HTTP errors
import type {
  RegisterInput,
  LoginInput,
  PublicUser,
  Role,
  JwtPayload,
} from "./auth.types";

// Step 2 — constants for this module.
const SALT_ROUNDS = 10; // bcrypt "cost": 2^10 iterations. Higher = slower = safer.
const JWT_EXPIRES_IN = "7d"; // a token is valid for 7 days, then the user re-logs in.

// The DB row shape for a user (snake_case, straight from Postgres). Internal only.
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

// Step 3 — a helper to strip the secret column before sending a user out.
// Takes a full DB row, returns the PublicUser (no password_hash, no google_id).
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

// Step 4 — sign a JWT for a given user. Called after successful register/login.
// The token encodes { sub: userId, role } and is signed so it can't be tampered.
export function issueToken(user: Pick<UserRow, "id" | "role">): string {
  const payload: JwtPayload = { sub: user.id, role: user.role };
  // jwt.sign(payload, secret, options) → the compact token string.
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Step 5 — verify a JWT string and return its payload (used by auth.middleware).
// Throws ApiError.unauthorized if the token is missing/expired/forged.
export function verifyToken(token: string): JwtPayload {
  try {
    // jwt.verify checks the signature AND expiry using the same secret.
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch {
    // Any failure (bad signature, expired, malformed) → 401, no detail leaked.
    throw ApiError.unauthorized("Invalid or expired token");
  }
}

// Step 6 — register a new email/password user.
export async function register(
  input: RegisterInput
): Promise<{ user: PublicUser; token: string }> {
  // 6a) Is this email already taken? One query, fail early with 409 Conflict.
  const existing = await query<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [input.email]
  );
  if (existing.length > 0) {
    throw ApiError.conflict("An account with this email already exists");
  }

  // 6b) Hash the password. bcrypt.hash generates a random salt and folds it in,
  // so two identical passwords produce DIFFERENT hashes (rainbow-table proof).
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

  // 6c) Insert the new user. RETURNING * hands us the created row back in one trip.
  // Parameters ($1, $2, ...) are sent separately from the SQL → SQL-injection safe.
  const rows = await query<UserRow>(
    `INSERT INTO users (email, password_hash, name, phone, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.email,
      passwordHash,
      input.name,
      input.phone ?? null, // no phone → store NULL
      input.role ?? "CUSTOMER", // no role → default to CUSTOMER
    ]
  );
  const user = rows[0];

  // 6d) Log them in immediately by issuing a token, so the client needn't call
  // /login right after /register.
  const token = issueToken(user);
  return { user: toPublicUser(user), token };
}

// Step 7 — log in an existing email/password user.
export async function login(
  input: LoginInput
): Promise<{ user: PublicUser; token: string }> {
  // 7a) Find the user by email.
  const rows = await query<UserRow>(
    "SELECT * FROM users WHERE email = $1",
    [input.email]
  );
  const user = rows[0];

  // 7b) SECURITY: give the SAME error whether the email is unknown OR the
  // password is wrong. Telling the attacker "email exists but wrong password"
  // leaks which emails are registered. So: one vague 401 for both cases.
  if (!user || !user.password_hash) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // 7c) Compare the submitted password against the stored hash (bcrypt re-hashes
  // the attempt with the stored salt and checks equality — constant-time).
  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  // 7d) Success → issue a fresh token.
  const token = issueToken(user);
  return { user: toPublicUser(user), token };
}

// Step 8 — fetch the current user's profile by id (used by GET /auth/me).
// The id comes from the verified JWT, so this is already an authenticated call.
export async function getById(userId: string): Promise<PublicUser> {
  const rows = await query<UserRow>("SELECT * FROM users WHERE id = $1", [userId]);
  if (rows.length === 0) {
    // Token was valid but the user was deleted since — treat as unauthorized.
    throw ApiError.unauthorized("User no longer exists");
  }
  return toPublicUser(rows[0]);
}

// Step 9 — Google login (Google-READY, wired fully on Day 6 with the frontend).
// The frontend's NextAuth flow will verify the Google token and hand us the
// trusted profile { googleId, email, name }. Here we "upsert": if a user with
// that email/google_id exists we log them in; otherwise we create a
// password-less account. Kept here so the DB shape and flow are proven on Day 2.
export async function loginWithGoogle(profile: {
  googleId: string;
  email: string;
  name: string;
}): Promise<{ user: PublicUser; token: string }> {
  // 9a) Try to find an existing user by google_id OR the same email.
  const existing = await query<UserRow>(
    "SELECT * FROM users WHERE google_id = $1 OR email = $2",
    [profile.googleId, profile.email.toLowerCase()]
  );

  let user: UserRow;
  if (existing.length > 0) {
    // 9b) Found — make sure google_id is stored (links an email account to Google).
    user = existing[0];
    if (!user.google_id) {
      const updated = await query<UserRow>(
        "UPDATE users SET google_id = $1 WHERE id = $2 RETURNING *",
        [profile.googleId, user.id]
      );
      user = updated[0];
    }
  } else {
    // 9c) New Google user — create a password-less account (password_hash stays NULL).
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
