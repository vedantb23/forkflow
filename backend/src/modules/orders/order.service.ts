import { pool, query } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { checkIdempotency, storeIdempotency } from "../../utils/idempotency";
import { reserveSlot, releaseSlot } from "../capacity/capacity.service";
import { acquireLock, releaseLock } from "./order.lock";
import { orderQueue } from "../../queues";
import { getIo } from "../../realtime/socket";
import { SERVER_EVENTS } from "../../realtime/socket.events";
import { logger } from "../../config/logger";
import type { PlaceOrderInput, OrderRow, OrderItemRow, OrderView } from "./order.types";

export async function getOrderById(orderId: string): Promise<OrderView> {
  const orders = await query<OrderRow>("SELECT * FROM orders WHERE id = $1", [orderId]);
  if (orders.length === 0) throw ApiError.notFound("Order not found");
  const items = await query<OrderItemRow>(
    "SELECT * FROM order_items WHERE order_id = $1",
    [orderId]
  );
  return { order: orders[0], items };
}

export async function getOrdersForUser(userId: string): Promise<OrderRow[]> {
  return query<OrderRow>(
    "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
}

export async function getOrdersForRestaurant(
  restaurantId: string,
  ownerId: string
): Promise<OrderView[]> {

  const orders = await query<OrderRow>(
    `SELECT * FROM orders
     WHERE restaurant_id = $1
       AND restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = $2)
     ORDER BY created_at DESC`,
    [restaurantId, ownerId]
  );
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const items = await query<OrderItemRow>(
    "SELECT * FROM order_items WHERE order_id = ANY($1)",
    [orderIds]
  );

  return orders.map((order) => ({
    order,
    items: items.filter((it) => it.order_id === order.id),
  }));
}

export async function updateOrderStatus(
  orderId: string,
  ownerId: string,
  status: OrderRow["status"]
): Promise<OrderView> {

  const rows = await query<OrderRow>(
    `UPDATE orders SET status = $1
     WHERE id = $2
       AND restaurant_id IN (SELECT id FROM restaurants WHERE owner_id = $3)
     RETURNING *`,
    [status, orderId, ownerId]
  );
  if (rows.length === 0)
    throw ApiError.forbidden("Order not found or not owned by you");

  getIo()
    .to(`order:${orderId}`)
    .emit(SERVER_EVENTS.ORDER_STATUS_UPDATED, { orderId, status });

  if (status === "PREPARING") {

    getIo()
      .to("delivery_partners")
      .emit(SERVER_EVENTS.ORDER_STATUS_UPDATED, { orderId, status });
  }

  logger.info({ orderId, status }, "orders: status updated by owner (emitted live)");

  const items = await query<OrderItemRow>(
    "SELECT * FROM order_items WHERE order_id = $1",
    [orderId]
  );
  return { order: rows[0], items };
}

export async function placeOrder(
  userId: string,
  input: PlaceOrderInput,
  idempotencyToken: string | undefined
): Promise<OrderView> {

  if (idempotencyToken) {
    const existingId = await checkIdempotency(idempotencyToken);
    if (existingId) return getOrderById(existingId);
  }

  const slot = await reserveSlot(input.restaurant_id);

  const acquiredLocks: { key: string; token: string }[] = [];

  try {

    for (const item of input.items) {
      const lockKey = `item:${item.menu_item_id}`;
      const token = await acquireLock(lockKey);
      if (!token) {

        throw ApiError.conflict(
          `Item ${item.menu_item_id} is being processed by another request. Please retry.`
        );
      }
      acquiredLocks.push({ key: lockKey, token });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let totalAmount = 0;
      const snapshots: { menu_item_id: string; name: string; price: string; quantity: number }[] = [];

      for (const item of input.items) {
        const updated = await client.query<{ id: string; name: string; price: string }>(
          `UPDATE menu_items
           SET stock = stock - $1
           WHERE id = $2 AND stock >= $1
           RETURNING id, name, price`,
          [item.quantity, item.menu_item_id]
        );
        if (updated.rows.length === 0) {

          await client.query("ROLLBACK");
          throw ApiError.conflict(
            `"${item.menu_item_id}" is out of stock or has insufficient quantity.`
          );
        }
        const dish = updated.rows[0];
        const lineTotal = Number(dish.price) * item.quantity;
        totalAmount += lineTotal;
        snapshots.push({
          menu_item_id: item.menu_item_id,
          name: dish.name,
          price: dish.price,
          quantity: item.quantity,
        });
      }

      const orderRows = await client.query<OrderRow>(
        `INSERT INTO orders (user_id, restaurant_id, total_amount, slot_window, idempotency_key)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          userId,
          input.restaurant_id,
          totalAmount.toFixed(2),
          slot.toISOString(),
          idempotencyToken ?? null,
        ]
      );
      const order = orderRows.rows[0];

      for (const snap of snapshots) {
        await client.query(
          `INSERT INTO order_items (order_id, menu_item_id, name_snapshot, price_snapshot, quantity)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, snap.menu_item_id, snap.name, snap.price, snap.quantity]
        );
      }

      await client.query("COMMIT");

      if (idempotencyToken) {
        await storeIdempotency(idempotencyToken, order.id);
      }

      await orderQueue.add(
        "process-order",
        { orderId: order.id },
        { jobId: order.id }
      );

      const items = await query<OrderItemRow>(
        "SELECT * FROM order_items WHERE order_id = $1",
        [order.id]
      );

      getIo()
        .to(`restaurant:${order.restaurant_id}`)
        .emit(SERVER_EVENTS.ORDER_NEW, {
          orderId: order.id,
          status: order.status,
          total_amount: order.total_amount,
          created_at: order.created_at,
        });

      return { order, items };
    } catch (err) {

      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {

    await releaseSlot(input.restaurant_id, slot);
    throw err;
  } finally {

    for (const { key, token } of acquiredLocks.reverse()) {
      await releaseLock(key, token);
    }
  }
}

export async function listAllOrders(): Promise<OrderView[]> {
  const orders = await query<OrderRow>("SELECT * FROM orders ORDER BY created_at DESC");
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const items = await query<OrderItemRow>(
    "SELECT * FROM order_items WHERE order_id = ANY($1)",
    [orderIds]
  );

  return orders.map((order) => ({
    order,
    items: items.filter((it) => it.order_id === order.id),
  }));
}

export async function adminUpdateOrderStatus(
  orderId: string,
  status: OrderRow["status"]
): Promise<OrderView> {
  const rows = await query<OrderRow>(
    `UPDATE orders SET status = $1 WHERE id = $2 RETURNING *`,
    [status, orderId]
  );
  if (rows.length === 0) throw ApiError.notFound("Order not found");

  getIo()
    .to(`order:${orderId}`)
    .emit(SERVER_EVENTS.ORDER_STATUS_UPDATED, { orderId, status });

  logger.info({ orderId, status }, "orders: status updated by admin");

  const items = await query<OrderItemRow>(
    "SELECT * FROM order_items WHERE order_id = $1",
    [orderId]
  );
  return { order: rows[0], items };
}
