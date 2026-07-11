// ─────────────────────────────────────────────────────────────
// server.ts — the entry point. It takes the app from app.ts and opens the port.
// This is the file `npm run dev` runs (see package.json "dev" script).
// WHY separate from app.ts? app.ts = WHAT the server does; server.ts = actually
// turning it on. Keeping them apart makes the app importable in tests.
// ─────────────────────────────────────────────────────────────

// Step 1 — imports.
import { app } from "./app"; // the configured Express app
import { env } from "./config/env"; // validated env (for PORT)
import { logger } from "./config/logger"; // shared logger

// Step 2 — start listening on the configured port.
// app.listen opens the TCP port and runs the callback once it's ready.
const server = app.listen(env.PORT, () => {
  logger.info(`🚀 ForkFlow API running on http://localhost:${env.PORT}`);
  logger.info(`   Health check: http://localhost:${env.PORT}/health`);
});

// Step 3 — graceful shutdown.
// WHY: when we stop the server (Ctrl+C, or the host sends SIGTERM on deploy),
// we want to stop accepting new requests and close cleanly instead of dying
// mid-request. Later we'll also close Redis/DB connections here.
function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully...`);
  server.close(() => {
    logger.info("HTTP server closed. Bye 👋");
    process.exit(0); // 0 = clean exit
  });
}

// SIGINT = Ctrl+C in the terminal. SIGTERM = what deploy platforms send to stop.
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
