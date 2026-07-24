// ─────────────────────────────────────────────────────────────
// order.handler.ts — wires up what an authenticated socket can DO regarding orders.
//
// CONCEPT — rooms: a "room" is just a named group of sockets. socket.join("order:123")
// adds this connection to that group; io.to("order:123").emit(...) later reaches only
// members. That's how order 123's customer sees ONLY order 123's updates.
//
// CONCEPT — per-room authorization: the handshake (socket.auth.ts) proved WHO the user
// is. But being logged in doesn't mean you may watch ANY order — so before joining a
// room we check the DB that this user actually owns (or serves) that order. Auth = "in
// the door"; this = "which rooms you're allowed into".
// ─────────────────────────────────────────────────────────────

// Step 1 — imports.
import type { Server, Socket } from "socket.io";
import { CLIENT_EVENTS } from "../socket.events";
import { query } from "../../config/db";
import { logger } from "../../config/logger";

// Step 2 — register all order-related listeners on a freshly-connected socket.
// Called once per connection from socket.ts. `io` is passed in case a handler
// needs to emit to other rooms (not needed yet, but keeps the signature uniform).
export function registerOrderHandlers(io: Server, socket: Socket): void {
  const user = socket.data.user; // { sub: userId, role } — set by socketAuth

  // Step 3 — client asks to join an order's room ("I'm watching this order").
  // Payload: { orderId }. We verify the user is allowed, then socket.join.
  socket.on(CLIENT_EVENTS.JOIN_ORDER, async (payload: { orderId?: string }) => {
    const orderId = payload?.orderId;
    if (!orderId) {
      // Malformed request — tell just this socket, don't crash the server.
      socket.emit("error", { message: "orderId is required to join an order room" });
      return;
    }

    try {
      // 3a) Load the order's owner + restaurant so we can authorize the join.
      const rows = await query<{ user_id: string; restaurant_id: string }>(
        "SELECT user_id, restaurant_id FROM orders WHERE id = $1",
        [orderId]
      );
      if (rows.length === 0) {
        socket.emit("error", { message: "Order not found" });
        return;
      }
      const order = rows[0];

      // 3b) Authorization rule: allowed to watch this order if you are
      //     - the customer who placed it, OR
      //     - staff (RESTAURANT_OWNER / DELIVERY / ADMIN).
      // (Owner-of-THIS-restaurant tightening can come later; role check is enough now.)
      const isCustomerOwner = order.user_id === user.sub;
      const isStaff = user.role === "RESTAURANT_OWNER" || user.role === "DELIVERY" || user.role === "ADMIN";
      if (!isCustomerOwner && !isStaff) {
        socket.emit("error", { message: "Not allowed to watch this order" });
        return;
      }

      // 3c) Allowed → join the room. Room name matches what the worker emits to.
      const room = `order:${orderId}`;
      await socket.join(room);
      logger.debug({ userId: user.sub, room }, "socket joined order room");
      // Optional ack so the client knows the join succeeded.
      socket.emit("joined", { room });
    } catch (err) {
      logger.error({ err, orderId }, "order.handler: JOIN_ORDER failed");
      socket.emit("error", { message: "Failed to join order room" });
    }
  });

  // Step 4 — restaurant owner joins their restaurant's room to get new orders live.
  // Payload: { restaurantId }. Only staff roles may join a restaurant room.
  socket.on(CLIENT_EVENTS.JOIN_RESTAURANT, async (payload: { restaurantId?: string }) => {
    const restaurantId = payload?.restaurantId;
    if (!restaurantId) {
      socket.emit("error", { message: "restaurantId is required" });
      return;
    }

    // 4a) Only RESTAURANT_OWNER / ADMIN should watch an incoming-orders feed.
    const isStaff = user.role === "RESTAURANT_OWNER" || user.role === "ADMIN";
    if (!isStaff) {
      socket.emit("error", { message: "Not allowed to watch this restaurant" });
      return;
    }

    // 4b) Join the restaurant room. The worker emits ORDER_NEW here on placement.
    const room = `restaurant:${restaurantId}`;
    await socket.join(room);
    logger.debug({ userId: user.sub, room }, "socket joined restaurant room");
    socket.emit("joined", { room });
  });
}
