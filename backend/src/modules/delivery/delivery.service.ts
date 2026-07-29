// delivery.service.ts — business logic for delivery assignments (Day 6).
//
// Flow: owner/admin assigns a DELIVERY partner to an order → the partner updates
// status as they go (ASSIGNED → PICKED_UP → DELIVERED) → GPS pings update location.
//
// REAL-TIME NOTE: this service runs in the API process — the SAME process that owns
// the Socket.io server. So we can emit directly with getIo() (no queue hop needed).
// The Redis adapter still fans the event out correctly. (The WORKER process can't do
// this — it uses the redis-emitter instead, Piece 3.)

import { query } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { getIo } from "../../realtime/socket";
import { SERVER_EVENTS } from "../../realtime/socket.events";
import { logger } from "../../config/logger";
import type { DeliveryAssignmentRow, DeliveryStatus } from "./delivery.types";
import type { OrderRow, OrderItemRow, OrderView } from "../orders/order.types";

// A job-feed row: a full OrderView plus the delivery assignment (or null if no
// partner has claimed/been assigned it yet). Lets the dashboard resolve "is this
// trip mine?" from the feed alone — no per-order assignment lookups.
export type DeliveryFeedItem = OrderView & {
  assignment: DeliveryAssignmentRow | null;
};

// Step 0 — the delivery partner's job feed: orders that are ready to carry.
// We surface anything PREPARING (ready for pickup) or OUT_FOR_DELIVERY (a trip the
// partner is already on), newest first, each as a full OrderView so the dashboard
// can show line items and totals. Returned to DELIVERY-role users (guarded in the
// route). This is intentionally simple for the demo — no geo radius, no dedupe by
// partner; the UI splits "available" (PREPARING) vs "active" (OUT_FOR_DELIVERY).
//
// Each row also carries its `assignment` (or null) so the dashboard can tell which
// OUT_FOR_DELIVERY trips belong to the current partner WITHOUT firing a per-order
// GET /delivery/:id (which N+1s and 404s on any order lacking an assignment row).
export async function getAvailableDeliveries(): Promise<DeliveryFeedItem[]> {
  const orders = await query<OrderRow>(
    `SELECT * FROM orders
     WHERE status IN ('PREPARING', 'OUT_FOR_DELIVERY')
     ORDER BY created_at DESC`
  );
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);

  // One query for all line items (avoids N+1), then group per order.
  const items = await query<OrderItemRow>(
    "SELECT * FROM order_items WHERE order_id = ANY($1)",
    [orderIds]
  );

  // One query for all assignments too — attach each (or null) to its order.
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

// Step 1 — fetch the assignment for an order (used by GET + guards below).
export async function getAssignment(orderId: string): Promise<DeliveryAssignmentRow> {
  const rows = await query<DeliveryAssignmentRow>(
    "SELECT * FROM delivery_assignments WHERE order_id = $1",
    [orderId]
  );
  if (rows.length === 0) throw ApiError.notFound("No delivery assignment for this order");
  return rows[0];
}

// Step 2 — assign a partner to an order (RESTAURANT_OWNER / ADMIN action).
export async function assignPartner(
  orderId: string,
  partnerId: string
): Promise<DeliveryAssignmentRow> {
  // 2a) The order must exist and be in a deliverable state (cooked or cooking).
  const orders = await query<{ id: string; status: string }>(
    "SELECT id, status FROM orders WHERE id = $1",
    [orderId]
  );
  if (orders.length === 0) throw ApiError.notFound("Order not found");
  if (["DELIVERED", "CANCELLED"].includes(orders[0].status))
    throw ApiError.badRequest(`Order is already ${orders[0].status} — cannot assign delivery PARTNER`);

  // 2b) The partner must be a real user with the DELIVERY role.
  const partners = await query<{ id: string }>(
    "SELECT id FROM users WHERE id = $1 AND role = 'DELIVERY'",
    [partnerId]
  );
  if (partners.length === 0) throw ApiError.badRequest("partner_id is not a DELIVERY user");

  // 2c) Upsert the assignment. delivery_assignments has UNIQUE(order_id), so
  //     ON CONFLICT turns "insert or update" into one atomic statement —
  //     re-assigning an order just swaps the partner, never duplicates the row.
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

// Step 2d — a partner CLAIMS an available order for themselves. This is the demo's
// "Accept Trip" button: instead of an owner assigning, the logged-in DELIVERY user
// grabs a ready order. It upserts an assignment to this partner, flips the delivery
// to PICKED_UP and the order to OUT_FOR_DELIVERY, and emits the change live.
// ON CONFLICT (order_id) ... WHERE partner_id IS NULL means only an UNCLAIMED order
// can be taken — two partners racing for the same trip → exactly one wins.
export async function claimDelivery(
  orderId: string,
  partnerId: string
): Promise<DeliveryAssignmentRow> {
  // 2d-i) The order must exist and still be pickup-ready (PREPARING).
  const orders = await query<{ id: string; status: string }>(
    "SELECT id, status FROM orders WHERE id = $1",
    [orderId]
  );
  if (orders.length === 0) throw ApiError.notFound("Order not found");
  if (orders[0].status !== "PREPARING")
    throw ApiError.badRequest(`Order is ${orders[0].status} — not available to claim`);

  // 2d-ii) Atomically claim it: insert an assignment, or take over only if it's
  //         still unclaimed. If another partner already holds it, zero rows return.
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

  // 2d-iii) Move the order to OUT_FOR_DELIVERY and tell the customer live.
  await query("UPDATE orders SET status = 'OUT_FOR_DELIVERY' WHERE id = $1", [orderId]);
  getIo()
    .to(`order:${orderId}`)
    .emit(SERVER_EVENTS.ORDER_STATUS_UPDATED, { orderId, status: "OUT_FOR_DELIVERY" });
  logger.info({ orderId, partnerId }, "delivery: trip claimed by partner (emitted live)");

  return rows[0];
}

// Step 3 — the partner updates the delivery status as they progress.
// Side effect: some delivery statuses move the ORDER status too, and we push that
// to the customer's browser live.
export async function updateStatus(
  orderId: string,
  partnerId: string,
  status: DeliveryStatus
): Promise<DeliveryAssignmentRow> {
  // 3a) Load the assignment and check this partner owns it (a partner can only
  //     update THEIR deliveries — not someone else's).
  const assignment = await getAssignment(orderId);
  if (assignment.partner_id !== partnerId)
    throw ApiError.forbidden("This delivery is not assigned to you");

  // 3b) Update the delivery status.
  const rows = await query<DeliveryAssignmentRow>(
    "UPDATE delivery_assignments SET status = $1 WHERE order_id = $2 RETURNING *",
    [status, orderId]
  );

  // 3c) Mirror onto the order where it makes sense:
  //     PICKED_UP → order OUT_FOR_DELIVERY ("your food is on the way")
  //     DELIVERED → order DELIVERED ("enjoy!")
  const orderStatus =
    status === "PICKED_UP" ? "OUT_FOR_DELIVERY" : status === "DELIVERED" ? "DELIVERED" : null;

  if (orderStatus) {
    await query("UPDATE orders SET status = $1 WHERE id = $2", [orderStatus, orderId]);

    // 3d) Tell the customer's browser RIGHT NOW. We're in the API process, so we
    //     emit straight through io — the Redis adapter delivers it to whichever
    //     server holds that customer's socket.
    getIo()
      .to(`order:${orderId}`)
      .emit(SERVER_EVENTS.ORDER_STATUS_UPDATED, { orderId, status: orderStatus });
    logger.info({ orderId, orderStatus }, "delivery: order status emitted live");
  }

  return rows[0];
}

// Step 4 — persist a GPS ping + broadcast it to whoever is watching the order.
// (The socket handler does live relaying too; this HTTP path also SAVES the last
// position, so a customer who opens the page late still sees where the bike is.)
export async function updateLocation(
  orderId: string,
  partnerId: string,
  lat: number,
  lng: number
): Promise<DeliveryAssignmentRow> {
  // 4a) Same ownership guard as updateStatus.
  const assignment = await getAssignment(orderId);
  if (assignment.partner_id !== partnerId)
    throw ApiError.forbidden("This delivery is not assigned to you");

  // 4b) Save the last-known position.
  const rows = await query<DeliveryAssignmentRow>(
    "UPDATE delivery_assignments SET current_lat = $1, current_lng = $2 WHERE order_id = $3 RETURNING *",
    [lat, lng, orderId]
  );

  // 4c) Broadcast to the order room so open maps move instantly.
  getIo()
    .to(`order:${orderId}`)
    .emit(SERVER_EVENTS.DELIVERY_LOCATION_UPDATED, { orderId, lat, lng, at: Date.now() });

  return rows[0];
}
