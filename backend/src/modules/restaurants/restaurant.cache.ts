import { redis } from "../../config/redis";
import { logger } from "../../config/logger";
import { CACHE_TTL } from "../../config/constants";
import type { RestaurantRow } from "./restaurant.types";

const LIST_KEY = "restaurants:list";

export async function getCachedRestaurantList(): Promise<RestaurantRow[] | null> {
  const cached = await redis.get(LIST_KEY);
  if (cached) {
    logger.info("cache HIT: restaurants list");
    return JSON.parse(cached) as RestaurantRow[];
  }
  logger.info("cache MISS: restaurants list");
  return null;
}

export async function setCachedRestaurantList(list: RestaurantRow[]): Promise<void> {
  await redis.set(LIST_KEY, JSON.stringify(list), "EX", CACHE_TTL.RESTAURANT_LIST);
}

export async function invalidateRestaurantList(): Promise<void> {
  await redis.del(LIST_KEY);
  logger.info("cache INVALIDATED: restaurants list");
}
