import { redis } from "../../config/redis";
import { randomUUID } from "crypto";

const LOCK_TTL_MS = 5000;

export async function acquireLock(key: string): Promise<string | null> {
  const token = randomUUID();

  const result = await redis.set(`lock:${key}`, token, "PX", LOCK_TTL_MS, "NX");
  return result === "OK" ? token : null;
}

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
