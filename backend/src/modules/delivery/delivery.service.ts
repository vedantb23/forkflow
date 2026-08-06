import { query } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { getIo } from "../../realtime/socket";
import { SERVER_EVENTS } from "../../realtime/socket.events";
import { logger } from "../../config/logger";
import type { DeliveryAssignmentRow, DeliveryStatus } from "./delivery.types";
import type { OrderRow, OrderItemRow, OrderView } from "../orders/order.types";

export type DeliveryFeedItem = OrderView & {
  assignment: DeliveryAssignmentRow | null;
};

export async function getAvailableDeliveries(): Promise<DeliveryFeedItem[]> {
  const orders = await query<OrderRow>(
    `SELECT * FROM orders
     WHERE status IN ('PREPARING', 'OUT_FOR_DELIVERY')
     ORDER BY created_at DESC`
  );
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);

  const items = await query<OrderItemRow>(
    "SELECT * FROM order_items WHERE order_id = ANY($1)",
    [orderIds]
  );

  const assignments = await query<DeliveryAssignmentRow>(
    "SELECT * FROM delivery_assignments WHERE order_id = ANY($1)",
    [orderIds]
  );

  return orders.map((order) => ({
    order,
    items: items.filter((it) => it.order_id === order.id),
    assignment: assignments.find((a) => a.order_id === order.id) ?? null,
  }));
}

export async function getAssignment(orderId: string): Promise<DeliveryAssignmentRow> {
  const rows = await query<DeliveryAssignmentRow>(
    "SELECT * FROM delivery_assignments WHERE order_id = $1",
    [orderId]
  );
  if (rows.length === 0) throw ApiError.notFound("No delivery assignment for this order");
  return rows[0];
}

export async function assignPartner(
  orderId: string,
  partnerId: string
): Promise<DeliveryAssignmentRow> {

  const orders = await query<{ id: string; status: string }>(
    "SELECT id, status FROM orders WHERE id = $1",
    [orderId]
  );
  if (orders.length === 0) throw ApiError.notFound("Order not found");
  if (["DELIVERED", "CANCELLED"].includes(orders[0].status))
    throw ApiError.badRequest(`Order is already ${orders[0].status} — cannot assign delivery PARTNER`);

  const partners = await query<{ id: string }>(
    "SELECT id FROM users WHERE id = $1 AND role = 'DELIVERY'",
    [partnerId]
  );
  if (partners.length === 0) throw ApiError.badRequest("partner_id is not a DELIVERY user");

  const rows = await query<DeliveryAssignmentRow>(
    `INSERT INTO delivery_assignments (order_id, partner_id, status)
     VALUES ($1, $2, 'ASSIGNED')
     ON CONFLICT (order_id)
     DO UPDATE SET partner_id = EXCLUDED.partner_id, status = 'ASSIGNED'
     RETURNING *`,
    [orderId, partnerId]
  );
  logger.info({ orderId, partnerId }, "delivery: partner assigned");
  return rows[0];
}

export async function claimDelivery(
  orderId: string,
  partnerId: string
): Promise<DeliveryAssignmentRow> {

  const orders = await query<{ id: string; status: string }>(
    "SELECT id, status FROM orders WHERE id = $1",
    [orderId]
  );
  if (orders.length === 0) throw ApiError.notFound("Order not found");
  if (orders[0].status !== "PREPARING")
    throw ApiError.badRequest(`Order is ${orders[0].status} — not available to claim`);

  const rows = await query<DeliveryAssignmentRow>(
    `INSERT INTO delivery_assignments (order_id, partner_id, status)
     VALUES ($1, $2, 'PICKED_UP')
     ON CONFLICT (order_id)
     DO UPDATE SET partner_id = EXCLUDED.partner_id, status = 'PICKED_UP'
       WHERE delivery_assignments.partner_id IS NULL OR delivery_assignments.partner_id = EXCLUDED.partner_id
     RETURNING *`,
    [orderId, partnerId]
  );
  if (rows.length === 0) throw ApiError.badRequest("This trip was already taken");

  await query("UPDATE orders SET status = 'OUT_FOR_DELIVERY' WHERE id = $1", [orderId]);
  getIo()
    .to(`order:${orderId}`)
    .emit(SERVER_EVENTS.ORDER_STATUS_UPDATED, { orderId, status: "OUT_FOR_DELIVERY" });
  logger.info({ orderId, partnerId }, "delivery: trip claimed by partner (emitted live)");

  return rows[0];
}

export async function updateStatus(
  orderId: string,
  partnerId: string,
  status: DeliveryStatus
): Promise<DeliveryAssignmentRow> {

  const assignment = await getAssignment(orderId);
  if (assignment.partner_id !== partnerId)
    throw ApiError.forbidden("This delivery is not assigned to you");

  const rows = await query<DeliveryAssignmentRow>(
    "UPDATE delivery_assignments SET status = $1 WHERE order_id = $2 RETURNING *",
    [status, orderId]
  );

  const orderStatus =
    status === "PICKED_UP" ? "OUT_FOR_DELIVERY" : status === "DELIVERED" ? "DELIVERED" : null;

  if (orderStatus) {
    await query("UPDATE orders SET status = $1 WHERE id = $2", [orderStatus, orderId]);

    getIo()
      .to(`order:${orderId}`)
      .emit(SERVER_EVENTS.ORDER_STATUS_UPDATED, { orderId, status: orderStatus });
    logger.info({ orderId, orderStatus }, "delivery: order status emitted live");
  }

  return rows[0];
}

export async function updateLocation(
  orderId: string,
  partnerId: string,
  lat: number,
  lng: number
): Promise<DeliveryAssignmentRow> {

  const assignment = await getAssignment(orderId);
  if (assignment.partner_id !== partnerId)
    throw ApiError.forbidden("This delivery is not assigned to you");

  const rows = await query<DeliveryAssignmentRow>(
    "UPDATE delivery_assignments SET current_lat = $1, current_lng = $2 WHERE order_id = $3 RETURNING *",
    [lat, lng, orderId]
  );

  getIo()
    .to(`order:${orderId}`)
    .emit(SERVER_EVENTS.DELIVERY_LOCATION_UPDATED, { orderId, lat, lng, at: Date.now() });

  return rows[0];
}
