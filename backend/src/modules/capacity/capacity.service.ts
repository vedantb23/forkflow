import { redis } from "../../config/redis";
import { query } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { currentSlotWindow, slotTtlSeconds, slotRedisKey } from "./capacity.slots";

async function getMaxOrdersPerSlot(restaurantId: string): Promise<number> {
  const rows = await query<{ max_orders_per_slot: number }>(
    "SELECT max_orders_per_slot FROM restaurants WHERE id = $1",
    [restaurantId]
  );
  if (rows.length === 0) throw ApiError.notFound("Restaurant not found");
  return rows[0].max_orders_per_slot;
}

export async function reserveSlot(restaurantId: string): Promise<Date> {
  const slot = currentSlotWindow();
  const key = slotRedisKey(restaurantId, slot);

  const max = await getMaxOrdersPerSlot(restaurantId);
  const seeded = await redis.set(key, max, "EX", slotTtlSeconds(), "NX");

  const remaining = await redis.decr(key);
  if (remaining < 0) {

    await redis.incr(key);
    throw ApiError.conflict(
      "This restaurant's kitchen is fully booked for the current time slot. Try again in a few minutes."
    );
  }

  return slot;
}

export async function releaseSlot(restaurantId: string, slot: Date): Promise<void> {
  const key = slotRedisKey(restaurantId, slot);
  await redis.incr(key);
}
