// capacity.slots.ts — time-window helpers for kitchen capacity.
//
// The kitchen can only handle so many orders per 15-minute window. We "bucket"
// wall-clock time into fixed windows so every order in the same window competes
// for the same Redis counter. Example: 12:07 and 12:13 both land in the
// 12:00–12:15 bucket; 12:16 starts a fresh bucket.

import { SLOT_MINUTES } from "../../config/constants";

// currentSlotWindow — floor NOW to the nearest 15-min boundary.
// e.g. 12:07:33 → 12:00:00 UTC (as a Date).
// WHY floor? All orders in the same window share one capacity counter. Flooring
// gives a stable, deterministic key regardless of the exact second.
export function currentSlotWindow(): Date {
  const slotMs = SLOT_MINUTES * 60 * 1000; // 15 min in milliseconds
  const floored = Math.floor(Date.now() / slotMs) * slotMs; // round down
  return new Date(floored);
}

// slotTtlSeconds — seconds until the CURRENT window expires.
// We use this as the Redis TTL so the capacity key auto-deletes when the window
// closes, resetting capacity for the next window automatically.
export function slotTtlSeconds(): number {
  const slotMs = SLOT_MINUTES * 60 * 1000;
  const nextSlotMs = (Math.floor(Date.now() / slotMs) + 1) * slotMs; // start of next window
  return Math.ceil((nextSlotMs - Date.now()) / 1000); // seconds remaining
}

// slotRedisKey — the Redis key for a restaurant's capacity counter in a window.
// Format: capacity:<restaurantId>:<ISO-timestamp-of-window-start>
// e.g.  capacity:abc-123:2026-07-23T12:00:00.000Z
export function slotRedisKey(restaurantId: string, slot: Date): string {
  return `capacity:${restaurantId}:${slot.toISOString()}`;
}
