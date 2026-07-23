// capacity.service.ts — kitchen slot reservation using Redis atomic DECR.
//
// CONCEPT: Each restaurant has a max number of orders per 15-min window
// (max_orders_per_slot). We store a counter in Redis for each
// restaurant+window pair. When an order comes in we atomically decrement it.
// If it goes below 0 we reject and INCR back — the slot is full.
//
// WHY Redis DECR and not a DB column? DECR is atomic at the Redis level —
// two simultaneous requests can't both read "1" and both think they got the
// last slot. A DB UPDATE with a WHERE check would need a transaction + lock.
// Redis gives us the same guarantee with a single round-trip.

import { redis } from "../../config/redis";
import { query } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { currentSlotWindow, slotTtlSeconds, slotRedisKey } from "./capacity.slots";

// Step 1 — fetch the restaurant's max capacity from the DB.
// We only hit the DB on the very first reservation for a window (cache miss).
async function getMaxOrdersPerSlot(restaurantId: string): Promise<number> {
  const rows = await query<{ max_orders_per_slot: number }>(
    "SELECT max_orders_per_slot FROM restaurants WHERE id = $1",
    [restaurantId]
  );
  if (rows.length === 0) throw ApiError.notFound("Restaurant not found");
  return rows[0].max_orders_per_slot;
}

// Step 2 — reserveSlot: atomically claim one unit of capacity for the current window.
// Returns the slot Date so the caller can store it on the order row.
// Throws 429 if the slot is full.
export async function reserveSlot(restaurantId: string): Promise<Date> {
  const slot = currentSlotWindow();
  const key = slotRedisKey(restaurantId, slot);

  // 2a) If the key doesn't exist yet, seed it from the DB then set its TTL.
  // SETNX (SET if Not eXists) is atomic — only one concurrent caller seeds it.
  const max = await getMaxOrdersPerSlot(restaurantId);
  const seeded = await redis.set(key, max, "EX", slotTtlSeconds(), "NX");
  // seeded === "OK" means we just created it; null means it already existed — both fine.

  // 2b) Atomically decrement. If the result is < 0, the slot is full — undo and reject.
  const remaining = await redis.decr(key);
  if (remaining < 0) {
    // INCR back so the counter stays accurate for the next caller.
    await redis.incr(key);
    throw ApiError.conflict(
      "This restaurant's kitchen is fully booked for the current time slot. Try again in a few minutes."
    );
  }

  return slot;
}

// Step 3 — releaseSlot: give back a unit of capacity (used on order failure/rollback).
// We INCR the counter so the next caller can use the freed slot.
export async function releaseSlot(restaurantId: string, slot: Date): Promise<void> {
  const key = slotRedisKey(restaurantId, slot);
  await redis.incr(key);
}
