// utils/idempotency.ts — prevent duplicate orders from retried requests.
//
// CONCEPT: A client sends a unique `Idempotency-Key` header with each order
// request. If the network drops and they retry, we return the SAME order
// instead of creating a second one. We store key → orderId in Redis with a
// 24-hour TTL (long enough to cover any reasonable retry window).

import { redis } from "../config/redis";

const TTL_SECONDS = 60 * 60 * 24; // 24 hours

// idempotencyKey — the Redis key for a given client-supplied idempotency token.
function redisKey(token: string): string {
  return `idempotency:${token}`;
}

// checkIdempotency — returns the existing orderId if this token was already used,
// or null if this is a fresh request.
export async function checkIdempotency(token: string): Promise<string | null> {
  return redis.get(redisKey(token));
}

// storeIdempotency — record that this token produced the given orderId.
// Call this AFTER the order is successfully committed to the DB.
export async function storeIdempotency(token: string, orderId: string): Promise<void> {
  await redis.set(redisKey(token), orderId, "EX", TTL_SECONDS);
}
