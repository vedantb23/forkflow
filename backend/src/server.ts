import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { redis } from "./config/redis";
import { pool, connectDb } from "./config/db";
import { initSocket } from "./realtime/socket";

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 ForkFlow API running on http://localhost:${env.PORT}`);
  logger.info(`   Health check: http://localhost:${env.PORT}/health`);

  connectDb().catch((err) => logger.error({ err }, "Postgres connect check failed"));
});

initSocket(server);

function shutdown(signal: string) {
  logger.info(`${signal} received — shutting down gracefully...`);
  server.close(async () => {
    logger.info("HTTP server closed.");
    await redis.quit();
    await pool.end();
    logger.info("Redis + Postgres connections closed. Bye 👋");
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
