// order.service.ts — placeOrder: the concurrency core of ForkFlow.
//
// The race problem: two customers hit "Place Order" at the same millisecond for
// the last item in stock. Without protection, both read stock=1, both think they
// won, both decrement → stock goes to -1 and two orders exist for one item.
//
// Our solution (three layers):
//   1. Idempotency key  — a retried request returns the SAME order, not a new one.
//   2. Capacity slot    — kitchen can only handle N orders per 15-min window.
//   3. Redis lock + DB atomic UPDATE — only one request can decrement stock at a
//      time; the DB UPDATE's WHERE stock >= qty is the final guard.

import { pool, query } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { checkIdempotency, storeIdempotency } from "../../utils/idempotency";
import { reserveSlot, releaseSlot } from "../capacity/capacity.service";
import { acquireLock, releaseLock } from "./order.lock";
import { orderQueue } from "../../queues";
import { getIo } from "../../realtime/socket";
import { SERVER_EVENTS } from "../../realtime/socket.events";
import type { PlaceOrderInput, OrderRow, OrderItemRow, OrderView } from "./order.types";

// Step 1 — fetch a placed order by id (used for idempotency replay + GET endpoint).
export async function getOrderById(orderId: string): Promise<OrderView> {
  const orders = await query<OrderRow>("SELECT * FROM orders WHERE id = $1", [orderId]);
  if (orders.length === 0) throw ApiError.notFound("Order not found");
  const items = await query<OrderItemRow>(
    "SELECT * FROM order_items WHERE order_id = $1",
    [orderId]
  );
  return { order: orders[0], items };
}

// Step 2 — list orders for the logged-in customer.
export async function getOrdersForUser(userId: string): Promise<OrderRow[]> {
  return query<OrderRow>(
    "SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC",
    [userId]
  );
}

// Step 3 — placeOrder: the main event.
export async function placeOrder(
  userId: string,
  input: PlaceOrderInput,
  idempotencyToken: string | undefined
): Promise<OrderView> {
  // 3a) Idempotency check — if we've seen this token before, return the existing order.
  // This handles the "network dropped, client retried" case without creating a duplicate.
  if (idempotencyToken) {
    const existingId = await checkIdempotency(idempotencyToken);
    if (existingId) return getOrderById(existingId);
  }

  // 3b) Reserve a kitchen capacity slot for this restaurant's current 15-min window.
  // Throws 429 if the kitchen is full. We get back the slot Date to store on the order.
  const slot = await reserveSlot(input.restaurant_id);

  // Track acquired locks so we can release them in the finally block.
  const acquiredLocks: { key: string; token: string }[] = [];

  try {
    // 3c) Acquire a Redis lock per menu item.
    // WHY per item and not per order? Two orders for DIFFERENT items don't need to
    // block each other — only orders competing for the SAME item do.
    for (const item of input.items) {
      const lockKey = `item:${item.menu_item_id}`;
      const token = await acquireLock(lockKey);
      if (!token) {
        // Another request holds the lock — the item is being processed right now.
        throw ApiError.conflict(
          `Item ${item.menu_item_id} is being processed by another request. Please retry.`
        );
      }
      acquiredLocks.push({ key: lockKey, token });
    }

    // 3d) Inside a DB transaction: atomically decrement stock and create the order.
    // We use a pg client (not the pool helper) so we can wrap everything in BEGIN/COMMIT.
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // For each item: UPDATE stock WHERE stock >= qty.
      // If 0 rows are updated, stock was insufficient — abort immediately.
      // This is the FINAL guard: even if two requests got past the lock (e.g. lock
      // expired), only one can win this atomic UPDATE.
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
          // Stock was insufficient — roll back everything.
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

      // Insert the order row.
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

      // Insert order_items snapshot (name + price at time of order — menu can change later).
      for (const snap of snapshots) {
        await client.query(
          `INSERT INTO order_items (order_id, menu_item_id, name_snapshot, price_snapshot, quantity)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, snap.menu_item_id, snap.name, snap.price, snap.quantity]
        );
      }

      await client.query("COMMIT");

      // 3e) Store idempotency key → orderId so retries return this order.
      if (idempotencyToken) { 
        await storeIdempotency(idempotencyToken, order.id);
      }

      // 3f) Enqueue the order for async processing (Day 5). The API returns
      // immediately; a separate worker process picks this job up and runs
      // payment → status transitions → email + notification.
      // jobId: order.id makes the enqueue idempotent at the QUEUE level too — the
      // same order can never sit in the queue twice (BullMQ dedupes by jobId).
      await orderQueue.add(
        "process-order",
        { orderId: order.id },
        { jobId: order.id }
      );

      const items = await query<OrderItemRow>(
        "SELECT * FROM order_items WHERE order_id = $1",
        [order.id]
      );

      // 3g) Notify the restaurant owner's dashboard in real time. placeOrder runs
      // in the API process (which owns the sockets), so getIo() works directly —
      // no Redis emitter needed here (that's only for the worker process).
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
      // If we haven't already rolled back (non-stock errors), roll back now.
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    // On any failure after reserving the slot, give it back so the next order can use it.
    await releaseSlot(input.restaurant_id, slot);
    throw err;
  } finally {
    // Always release every lock we acquired, in reverse order.
    for (const { key, token } of acquiredLocks.reverse()) {
      await releaseLock(key, token);
    }
  }
}
