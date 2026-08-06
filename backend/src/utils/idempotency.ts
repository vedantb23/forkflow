import { redis } from "../config/redis";

const TTL_SECONDS = 60 * 60 * 24;

function redisKey(token: string): string {
  return `idempotency:${token}`;
}

export async function checkIdempotency(token: string): Promise<string | null> {
  return redis.get(redisKey(token));
}

export async function storeIdempotency(token: string, orderId: string): Promise<void> {
  await redis.set(redisKey(token), orderId, "EX", TTL_SECONDS);
}
