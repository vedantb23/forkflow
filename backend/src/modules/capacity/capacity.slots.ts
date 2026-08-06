import { SLOT_MINUTES } from "../../config/constants";

export function currentSlotWindow(): Date {
  const slotMs = SLOT_MINUTES * 60 * 1000;
  const floored = Math.floor(Date.now() / slotMs) * slotMs;
  return new Date(floored);
}

export function slotTtlSeconds(): number {
  const slotMs = SLOT_MINUTES * 60 * 1000;
  const nextSlotMs = (Math.floor(Date.now() / slotMs) + 1) * slotMs;
  return Math.ceil((nextSlotMs - Date.now()) / 1000);
}

export function slotRedisKey(restaurantId: string, slot: Date): string {
  return `capacity:${restaurantId}:${slot.toISOString()}`;
}
