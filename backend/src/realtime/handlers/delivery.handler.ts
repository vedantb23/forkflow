import type { Server, Socket } from "socket.io";
import { CLIENT_EVENTS, SERVER_EVENTS } from "../socket.events";
import { logger } from "../../config/logger";

export function registerDeliveryHandlers(io: Server, socket: Socket): void {
  const user = socket.data.user;

  socket.on(CLIENT_EVENTS.JOIN_DELIVERY, () => {
    if (user.role !== "DELIVERY" && user.role !== "ADMIN") {
      socket.emit("error", { message: "Only delivery partners can join this room" });
      return;
    }
    socket.join("delivery_partners");
    logger.debug({ userId: user.sub }, "delivery.handler: joined delivery_partners room");
  });

  socket.on(
    CLIENT_EVENTS.SEND_LOCATION,
    (payload: { orderId?: string; lat?: number; lng?: number }) => {

      const canSend = user.role === "DELIVERY" || user.role === "ADMIN";
      if (!canSend) {
        socket.emit("error", { message: "Only delivery partners can send location" });
        return;
      }

      const { orderId, lat, lng } = payload ?? {};
      if (!orderId || typeof lat !== "number" || typeof lng !== "number") {
        socket.emit("error", { message: "orderId, lat and lng (numbers) are required" });
        return;
      }

      io.to(`order:${orderId}`).emit(SERVER_EVENTS.DELIVERY_LOCATION_UPDATED, {
        orderId,
        lat,
        lng,
        at: Date.now(),
      });
      logger.debug({ orderId, lat, lng }, "delivery.handler: relayed location");
    }
  );
}
