// rateLimit.middleware.ts — Redis-based rate limiter for public endpoints.
//
// WHY Redis and not just an in-memory counter?
// Think of it like a shared counter at a parking garage entrance:
//   - In-memory counter = each parking attendant has their own clicker.
//     If you have 2 attendants (2 server instances), a user can get 100
//     requests per attendant = 200 total. Not fair, not accurate.
//   - Redis counter = ONE shared clicker in the booth. No matter which
//     attendant checks, the count is global. Works across any number of
//     server instances.
//
// HOW it works (sliding window, simplified to fixed window):
//   - Key: ratelimit:<ip>:<current-minute-bucket>
//   - On each request: INCR the key. If it's the first hit, set a TTL (auto-expire).
//   - If the count exceeds the limit → respond 429 "Too Many Requests".
//   - When the minute rolls over, a new key starts at 0 (old one expires on its own).

import type { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";

// Factory function: creates a rate-limiter middleware with customizable settings.
// windowSeconds = how long the window lasts (default 60 = 1 minute).
// maxRequests   = how many requests per IP per window (default 30).
export function rateLimit(windowSeconds = 60, maxRequests = 30) {
  return async function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    // Step 1 — build a unique key per IP per time window.
    // We floor the current epoch-seconds by windowSeconds to get a "bucket"
    // that changes once per window, so all requests in the same window share
    // one counter.
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown"; // client's IP
    const bucket = Math.floor(Date.now() / 1000 / windowSeconds);       // current window id
    const key = `ratelimit:${ip}:${bucket}`;                            // Redis key

    // Step 2 — atomically increment the counter for this IP+window.
    // INCR creates the key with value 1 if it doesn't exist, or adds 1 if it does.
    // This is atomic — two simultaneous requests can't both read 0 and both write 1.
    const count = await redis.incr(key);

    // Step 3 — if this is the first request in the window (count === 1),
    // set the key to auto-expire after the window duration. This is how
    // Redis "cleans up" old counters automatically.
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    // Step 4 — set standard rate-limit headers so the client knows the limits.
    // These are widely used by API consumers and tools like Postman.
    res.setHeader("X-RateLimit-Limit", maxRequests);           // max allowed
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - count)); // how many left

    // Step 5 — if over the limit, reject with 429 (Too Many Requests).
    if (count > maxRequests) {
      res.setHeader("Retry-After", windowSeconds); // tell client when to try again
      return res.status(429).json({
        success: false,
        message: `Too many requests. Limit: ${maxRequests} per ${windowSeconds}s. Try again later.`,
      });
    }

    // Step 6 — under the limit → let the request through to the next middleware/handler.
    next();
  };
}
