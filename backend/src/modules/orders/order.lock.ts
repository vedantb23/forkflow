// order.lock.ts — Redis distributed lock using SET NX PX pattern.
//
// CONCEPT: When two requests race to buy the last item, we need only ONE to win.
// A distributed lock means: before touching stock, a request must "acquire" the
// lock key in Redis. Only one caller can hold it at a time (SET NX = set only if
// Not eXists). The loser retries or gives up. The winner releases the lock when done.
//
// SAFE RELEASE via Lua: a naive DEL would delete the key even if someone else
// acquired it after our TTL expired. The Lua script atomically checks that the
// stored token matches ours before deleting — so we only ever release OUR lock.

import { redis } from "../../config/redis";
import { randomUUID } from "crypto";

const LOCK_TTL_MS = 5000; // lock expires after 5 s even if we crash (prevents deadlock)

// acquireLock — try to set lock:<key> to a unique token.
// Returns the token string on success, null if the lock is already held.
export async function acquireLock(key: string): Promise<string | null> {
  const token = randomUUID(); // unique per acquisition — used to prove ownership on release
  // SET lock:<key> <token> PX 5000 NX
  // PX = expire after LOCK_TTL_MS milliseconds (auto-release on crash)
  // NX = only set if key does NOT exist (atomic "claim")
  // (ioredis types want the expiry option before NX; Redis accepts either order.)
  const result = await redis.set(`lock:${key}`, token, "PX", LOCK_TTL_MS, "NX");
  return result === "OK" ? token : null; // "OK" = we got it; null = someone else holds it
}

// releaseLock — delete the lock ONLY if we still own it (token matches).
// The Lua script runs atomically on the Redis server — no race between GET and DEL.
const RELEASE_SCRIPT = `
  if redis.call("GET", KEYS[1]) == ARGV[1] then
    return redis.call("DEL", KEYS[1])
  else
    return 0
  end
`;

export async function releaseLock(key: string, token: string): Promise<void> {
  await redis.eval(RELEASE_SCRIPT, 1, `lock:${key}`, token);
}
