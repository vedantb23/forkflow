// ─────────────────────────────────────────────────────────────
// logger.ts — a single shared logger for the whole app.
// WHY: console.log is fine for toys, but a real app needs structured logs
// (levels like info/warn/error, timestamps, JSON in production for log tools).
// We use `pino` (very fast) and `pino-pretty` (colored, readable output in dev).
// ─────────────────────────────────────────────────────────────

// Step 1 — import pino (the logger) and our validated env (to know dev vs prod).
import pino from "pino";
import { env } from "./env"; // reuse the ONE validated env object

// Step 2 — create and export the logger.
export const logger = pino({
  // In development we want pretty, colored, human-readable logs.
  // In production we leave raw JSON (better for log aggregators like Datadog).
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty", // the pretty-printer we installed
          options: {
            colorize: true, // add colors
            translateTime: "SYS:HH:MM:ss", // human-friendly timestamps
            ignore: "pid,hostname", // hide noisy fields in dev
          },
        }
      : undefined, // production: plain JSON, no transport
  // Log level: show everything from "debug" up in dev, but only "info" up in prod.
  level: env.NODE_ENV === "development" ? "debug" : "info",
});
