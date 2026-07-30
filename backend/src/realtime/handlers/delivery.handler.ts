// ─────────────────────────────────────────────────────────────
// delivery.handler.ts — real-time GPS relay for the "watch the bike move" feature.
//
// FLOW: the delivery partner's app emits SEND_LOCATION every few seconds while
// driving. The server re-broadcasts it to room `order:{orderId}` so the customer's
// map updates live. This is a socket→server→sockets relay: one sender, many watchers.
//
// AUTH: the handshake already proved identity. Here we add an ACTION check — only a
// DELIVERY (or ADMIN) socket may push a location; a customer cannot fake their food
// being nearby.
// ─────────────────────────────────────────────────────────────

// Step 1 — imports.
import type { Server, Socket } from "socket.io";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../socket.events";
import { logger } from "../../config/logger";

// Step 2 — register delivery listeners on a connected socket.
export function registerDeliveryHandlers(io: Server, socket: Socket): void {
  const user = socket.data.user; // { sub, role }

  // Step 2.5 — Delivery dashboard joins the "delivery_partners" room to get live feed updates.
  socket.on(CLIENT_EVENTS.JOIN_DELIVERY, () => {
    if (user.role !== "DELIVERY" && user.role !== "ADMIN") {
      socket.emit("error", { message: "Only delivery partners can join this room" });
      return;
    }
    socket.join("delivery_partners");
    logger.debug({ userId: user.sub }, "delivery.handler: joined delivery_partners room");
  });

  // Step 3 — a delivery partner pushes a new GPS position.
  // Payload: { orderId, lat, lng }.
  socket.on(
    CLIENT_EVENTS.SEND_LOCATION,
    (payload: { orderId?: string; lat?: number; lng?: number }) => {
      // 3a) Only delivery staff may broadcast a location.
      const canSend = user.role === "DELIVERY" || user.role === "ADMIN";
      if (!canSend) {
        socket.emit("error", { message: "Only delivery partners can send location" });
        return;
      }

      // 3b) Validate the payload — orderId plus numeric coordinates.
      const { orderId, lat, lng } = payload ?? {};
      if (!orderId || typeof lat !== "number" || typeof lng !== "number") {
        socket.emit("error", { message: "orderId, lat and lng (numbers) are required" });
        return;
      }

      // 3c) Broadcast to everyone watching this order (the customer's map).
      // io.to(room).emit sends to all sockets in the room EXCEPT... actually
      // includes all; the partner isn't watching their own map so that's fine.
      io.to(`order:${orderId}`).emit(SERVER_EVENTS.DELIVERY_LOCATION_UPDATED, {
        orderId,
        lat,
        lng,
        at: Date.now(), // timestamp so the client can ignore stale/out-of-order pings
      });
      logger.debug({ orderId, lat, lng }, "delivery.handler: relayed location");
    }
  );
}
