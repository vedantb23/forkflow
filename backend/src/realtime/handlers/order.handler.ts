import type { Server, Socket } from "socket.io";
import { CLIENT_EVENTS } from "../socket.events";
import { query } from "../../config/db";
import { logger } from "../../config/logger";

export function registerOrderHandlers(io: Server, socket: Socket): void {
  const user = socket.data.user;

  socket.on(CLIENT_EVENTS.JOIN_ORDER, async (payload: { orderId?: string }) => {
    const orderId = payload?.orderId;
    if (!orderId) {

      socket.emit("error", { message: "orderId is required to join an order room" });
      return;
    }

    try {

      const rows = await query<{ user_id: string; restaurant_id: string }>(
        "SELECT user_id, restaurant_id FROM orders WHERE id = $1",
        [orderId]
      );
      if (rows.length === 0) {
        socket.emit("error", { message: "Order not found" });
        return;
      }
      const order = rows[0];

      const isCustomerOwner = order.user_id === user.sub;
      const isStaff = user.role === "RESTAURANT_OWNER" || user.role === "DELIVERY" || user.role === "ADMIN";
      if (!isCustomerOwner && !isStaff) {
        socket.emit("error", { message: "Not allowed to watch this order" });
        return;
      }

      const room = `order:${orderId}`;
      await socket.join(room);
      logger.debug({ userId: user.sub, room }, "socket joined order room");

      socket.emit("joined", { room });
    } catch (err) {
      logger.error({ err, orderId }, "order.handler: JOIN_ORDER failed");
      socket.emit("error", { message: "Failed to join order room" });
    }
  });

  socket.on(CLIENT_EVENTS.JOIN_RESTAURANT, async (payload: { restaurantId?: string }) => {
    const restaurantId = payload?.restaurantId;
    if (!restaurantId) {
      socket.emit("error", { message: "restaurantId is required" });
      return;
    }

    const isStaff = user.role === "RESTAURANT_OWNER" || user.role === "ADMIN";
    if (!isStaff) {
      socket.emit("error", { message: "Not allowed to watch this restaurant" });
      return;
    }

    const room = `restaurant:${restaurantId}`;
    await socket.join(room);
    logger.debug({ userId: user.sub, room }, "socket joined restaurant room");
    socket.emit("joined", { room });
  });
}
