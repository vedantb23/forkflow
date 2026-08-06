import "dotenv/config";

function fail(message: string): never {
  console.error(`❌ Invalid environment variable: ${message}`);
  process.exit(1);
}

function requireString(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    fail(`${key} is required but missing/empty`);
  }
  return value;
}

function optionalString(key: string): string | undefined {
  const value = process.env[key];
  return value && value.trim() !== "" ? value : undefined;
}

const nodeEnvRaw = process.env.NODE_ENV ?? "development";
if (!["development", "production", "test"].includes(nodeEnvRaw)) {
  fail(`NODE_ENV must be development | production | test (got "${nodeEnvRaw}")`);
}

const NODE_ENV = nodeEnvRaw as "development" | "production" | "test";

const portRaw = process.env.PORT ?? "4000";
const PORT = Number(portRaw);
if (!Number.isInteger(PORT) || PORT <= 0) {
  fail(`PORT must be a positive integer (got "${portRaw}")`);
}

export const env = {

  NODE_ENV,
  PORT,
  CLIENT_URL: requireString("CLIENT_URL"),

  REDIS_URL: requireString("REDIS_URL"),

  DATABASE_URL: requireString("DATABASE_URL"),
  DIRECT_URL: requireString("DIRECT_URL"),

  JWT_SECRET: requireString("JWT_SECRET"),

  GOOGLE_CLIENT_ID: optionalString("GOOGLE_CLIENT_ID"),
  GOOGLE_CLIENT_SECRET: optionalString("GOOGLE_CLIENT_SECRET"),

  CLOUDINARY_CLOUD_NAME: optionalString("CLOUDINARY_CLOUD_NAME"),
  CLOUDINARY_API_KEY: optionalString("CLOUDINARY_API_KEY"),
  CLOUDINARY_API_SECRET: optionalString("CLOUDINARY_API_SECRET"),

  SMTP_HOST: optionalString("SMTP_HOST"),
  SMTP_PORT: optionalString("SMTP_PORT"),
  SMTP_USER: optionalString("SMTP_USER"),
  SMTP_PASS: optionalString("SMTP_PASS"),

  GEMINI_API_KEY: optionalString("GEMINI_API_KEY"),
  GROQ_API_KEY: optionalString("GROQ_API_KEY"),
  HUGGINGFACE_API_KEY: optionalString("HUGGINGFACE_API_KEY"),
} as const;
