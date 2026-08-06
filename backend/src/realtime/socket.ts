import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import { redis, createRedisClient } from "../config/redis";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { socketAuth } from "./socket.auth";
import { registerOrderHandlers } from "./handlers/order.handler";
import { registerDeliveryHandlers } from "./handlers/delivery.handler";

let io: Server | null = null;

export function initSocket(httpServer: HttpServer): Server {

  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });

  const pubClient = createRedisClient("pubClient");
  const subClient = createRedisClient("subClient");
  io.adapter(createAdapter(pubClient, subClient));
  logger.info("🔌 Socket.io Redis adapter attached (Pub/Sub across processes)");

  io.use(socketAuth);

  io.on("connection", (socket) => {
    logger.debug({ id: socket.id, userId: socket.data.user?.sub }, "socket connected");

    registerOrderHandlers(io!, socket);
    registerDeliveryHandlers(io!, socket);

    socket.on("disconnect", (reason) => {
      logger.debug({ id: socket.id, reason }, "socket disconnected");
    });
  });

  logger.info("✅ Socket.io initialized");
  return io;
}

export function getIo(): Server {
  if (!io) throw new Error("Socket.io not initialized — call initSocket(server) first");
  return io;
}
