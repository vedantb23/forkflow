// restaurant.cache.ts — cache-aside for the restaurant list.
// Pattern: GET from Redis → hit? return it. miss? caller fetches from DB,
// we SET it with a TTL so it expires on its own even if invalidation is missed.
// On any restaurant create/update/delete we DELETE the key (invalidation),
// so the next read rebuilds fresh data.

import { redis } from "../../config/redis";
import { logger } from "../../config/logger";
import { CACHE_TTL } from "../../config/constants";
import type { RestaurantRow } from "./restaurant.types";

// One key for the whole public list. If we add filters later, the filter values
// become part of the key (e.g. restaurants:list:cuisine=indian).
const LIST_KEY = "restaurants:list";

// Try the cache. Returns the parsed list on a hit, null on a miss.
export async function getCachedRestaurantList(): Promise<RestaurantRow[] | null> {
  const cached = await redis.get(LIST_KEY); // Redis stores strings, so we JSON.parse
  if (cached) {
    logger.info("cache HIT: restaurants list"); // the Day-3 verify step watches these logs
    return JSON.parse(cached) as RestaurantRow[];
  }
  logger.info("cache MISS: restaurants list");
  return null;
}

// Store the list with a TTL. "EX" = expire after N seconds — Redis deletes it
// by itself, so even a forgotten invalidation can only be stale for 60s max.
export async function setCachedRestaurantList(list: RestaurantRow[]): Promise<void> {
  await redis.set(LIST_KEY, JSON.stringify(list), "EX", CACHE_TTL.RESTAURANT_LIST);
}

// Invalidation: delete the key so the next read is a miss and rebuilds.
// Called after EVERY create/update/delete of a restaurant.
export async function invalidateRestaurantList(): Promise<void> {
  await redis.del(LIST_KEY);
  logger.info("cache INVALIDATED: restaurants list");
}
