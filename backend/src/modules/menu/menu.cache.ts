// menu.cache.ts — cache-aside for a restaurant's menu.
// Unlike the restaurant list (one key), menus need ONE KEY PER RESTAURANT:
// menu:<restaurantId>. Invalidation only busts that restaurant's menu, not everyone's.

import { redis } from "../../config/redis";
import { logger } from "../../config/logger";
import { CACHE_TTL } from "../../config/constants";
import type { MenuItemRow } from "./menu.types";

// key builder — one cache entry per restaurant
function menuKey(restaurantId: string): string {
  return `menu:${restaurantId}`;
}

export async function getCachedMenu(restaurantId: string): Promise<MenuItemRow[] | null> {
  const cached = await redis.get(menuKey(restaurantId));
  if (cached) {
    logger.info(`cache HIT: menu ${restaurantId}`);
    return JSON.parse(cached) as MenuItemRow[];
  }
  logger.info(`cache MISS: menu ${restaurantId}`);
  return null;
}

export async function setCachedMenu(restaurantId: string, menu: MenuItemRow[]): Promise<void> {
  await redis.set(menuKey(restaurantId), JSON.stringify(menu), "EX", CACHE_TTL.MENU);
}

// called on every menu-item create/update/delete for this restaurant
export async function invalidateMenu(restaurantId: string): Promise<void> {
  await redis.del(menuKey(restaurantId));
  logger.info(`cache INVALIDATED: menu ${restaurantId}`);
}
