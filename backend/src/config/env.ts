// ─────────────────────────────────────────────────────────────
// env.ts — load environment variables and validate them ONCE at boot.
// WHY: if a required secret is missing/typo'd, we want to crash immediately
// with a clear message — not deep inside the app when a request comes in.
// HOW: dotenv reads the .env file into process.env, then we hand-check the
// values we need. (No validation library — plain TypeScript.)
// ─────────────────────────────────────────────────────────────

// Step 1 — load the .env file into process.env.
// This must run before we read any process.env.* below.
import "dotenv/config"; // side-effect import: reads .env and populates process.env

// Step 2 — a tiny helper to fail fast with a readable message.
// We call this whenever the environment is invalid, so every failure looks
// the same and the process stops instead of limping along with bad config.
function fail(message: string): never {
  console.error(`❌ Invalid environment variable: ${message}`);
  process.exit(1); // stop the app — booting with bad config is never safe
}

// Step 3 — small readers that both fetch AND validate a value.

// requireString: the var MUST exist and be non-empty, else we crash.
// Use this for things we already have today (Day 1 core vars).
function requireString(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    fail(`${key} is required but missing/empty`);
  }
  return value;
}

// optionalString: the var MAY be absent right now (services we set up later).
// Returns the string if present, otherwise undefined.
function optionalString(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() !== "" ? value : undefined;
}

// Step 4 — read + validate NODE_ENV (must be one of three known values).
const nodeEnvRaw = process.env.NODE_ENV ?? "development"; // default to development
if (!["development", "production", "test"].includes(nodeEnvRaw)) {
  fail(`NODE_ENV must be development | production | test (got "${nodeEnvRaw}")`);
}
// Cast so TypeScript knows the exact allowed values, not just "string".
const NODE_ENV = nodeEnvRaw as "development" | "production" | "test";

// Step 5 — read + validate PORT (env vars are strings, we need a number).
const portRaw = process.env.PORT ?? "4000"; // default port 4000
const PORT = Number(portRaw); // "4000" → 4000
if (!Number.isInteger(PORT) || PORT <= 0) {
  fail(`PORT must be a positive integer (got "${portRaw}")`);
}

// Step 6 — build the final, typed env object.
// Required-now vars use requireString (crash if missing). Vars for services we
// wire up later use optionalString FOR NOW so the server can boot /health before
// those services exist. We flip each to requireString on the day we set it up.
export const env = {
  // ---- Core (required today) ----
  NODE_ENV, // "development" | "production" | "test"
  PORT, // a number, guaranteed positive
  CLIENT_URL: requireString("CLIENT_URL"), // frontend origin for CORS

  // ---- Redis (required — set up Day 1) ----
  REDIS_URL: requireString("REDIS_URL"), // e.g. redis://localhost:6379

  // ---- Postgres / Supabase (required — set up Day 1) ----
  DATABASE_URL: requireString("DATABASE_URL"), // pooled (6543), used by the app at runtime
  DIRECT_URL: requireString("DIRECT_URL"), // direct (5432), used by the migrate script (raw SQL)

  // ---- Auth (promoted Day 2) ----
  // JWT_SECRET is now REQUIRED: it signs/verifies every login token. Booting
  // without it would let auth "work" insecurely, so we crash if it's missing.
  JWT_SECRET: requireString("JWT_SECRET"),
  // Google keys stay optional until Day 6 (frontend NextAuth wires the real flow).
  GOOGLE_CLIENT_ID: optionalString("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: optionalString("GOOGLE_CLIENT_SECRET"),

  // ---- Cloudinary (promote Day 3) ----
  CLOUDINARY_CLOUD_NAME: optionalString("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: optionalString("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: optionalString("CLOUDINARY_API_SECRET"),

  // ---- Email (promote Day 5) ----
  SMTP_HOST: optionalString("SMTP_HOST"),
  SMTP_PORT: optionalString("SMTP_PORT"),
  SMTP_USER: optionalString("SMTP_USER"),
  SMTP_PASS: optionalString("SMTP_PASS"),

  // ---- RAG (promote Day 7) ----
  GEMINI_API_KEY: optionalString("GEMINI_API_KEY"),
} as const; // `as const` = this object is read-only; values never change at runtime
