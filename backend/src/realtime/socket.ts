// ─────────────────────────────────────────────────────────────
// socket.ts — creates the Socket.io server and bolts it onto our HTTP server.
//
// CONCEPT — the Redis adapter (the important bit): by default Socket.io tracks
// "which socket is in which room" in ONE process's memory. But ForkFlow runs TWO
// processes — the API (where browsers connect) and the worker (where order status
// changes). The worker needs to push to a browser it has no direct link to.
//
// The Redis adapter routes Socket.io's room messaging through Redis Pub/Sub. So when
// the worker publishes "emit to order:123" (via @socket.io/redis-emitter, Piece 3),
// THIS process — which actually holds that browser's connection — receives it over
// Redis and delivers it. Bonus: it's also what lets you run many API servers at once.
//
// It needs TWO Redis connections (pub + sub): a connection in "subscribe mode" can't
// also run normal commands, so the adapter keeps them separate.
// ─────────────────────────────────────────────────────────────

// Step 1 — imports.
import { Server } from "socket.io"; // the Socket.io server class
import type { Server as HttpServer } from "http"; // Node's raw HTTP server type
import { createAdapter } from "@socket.io/redis-adapter"; // the Redis Pub/Sub adapter
import { redis } from "../config/redis"; // our existing shared ioredis client
import { env } from "../config/env";
import { logger } from "../config/logger";
import { socketAuth } from "./socket.auth"; // JWT handshake middleware
import { registerOrderHandlers } from "./handlers/order.handler";
import { registerDeliveryHandlers } from "./handlers/delivery.handler";

// Step 2 — module-level holder for the io instance.
// We export a getter so other files (if ever needed) can reach it, but the primary
// consumer is this file. Kept null until initSocket runs.
let io: Server | null = null;

// Step 3 — the initializer. Called ONCE from server.ts after the HTTP server exists.
// It attaches Socket.io to the same server/port as Express (they share the port —
// HTTP requests and WebSocket upgrades travel over the same listener).
export function initSocket(httpServer: HttpServer): Server {
  // 3a) Create the Socket.io server, sharing Express's HTTP server.
  //     cors must allow the frontend origin, and credentials for cookie/JWT auth.
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL, // e.g. http://localhost:3000
      credentials: true,
    },
  });

  // 3b) Wire the Redis adapter. We need two connections: duplicate() clones the
  //     connection settings from our shared client. `pubClient` publishes messages,
  //     `subClient` listens for them. The adapter uses both under the hood.
  const pubClient = redis.duplicate(); // for publishing room messages
  const subClient = redis.duplicate(); // for subscribing to them
  io.adapter(createAdapter(pubClient, subClient));
  logger.info("🔌 Socket.io Redis adapter attached (Pub/Sub across processes)");

  // 3c) Register the handshake auth middleware. It runs for EVERY incoming
  //     connection before it goes live — no valid JWT, no socket.
  io.use(socketAuth);

  // 3d) On each successful connection, wire up that socket's event handlers.
  io.on("connection", (socket) => {
    logger.debug({ id: socket.id, userId: socket.data.user?.sub }, "socket connected");

    // Attach order + delivery listeners for this connection.
    registerOrderHandlers(io!, socket);
    registerDeliveryHandlers(io!, socket);

    // Log disconnects — useful when debugging "why did the client stop updating".
    socket.on("disconnect", (reason) => {
      logger.debug({ id: socket.id, reason }, "socket disconnected");
    });
  });

  logger.info("✅ Socket.io initialized");
  return io;
}

// Step 4 — accessor for the io instance (throws if used before init, which would
// be a programming error). Handy if a future HTTP handler wants to emit directly.
export function getIo(): Server {
  if (!io) throw new Error("Socket.io not initialized — call initSocket(server) first");
  return io;
}
