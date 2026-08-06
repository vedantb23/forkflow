import type { Request, Response, NextFunction } from "express";
import { redis } from "../config/redis";

export function rateLimit(windowSeconds = 60, maxRequests = 30) {
  return async function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {

    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const bucket = Math.floor(Date.now() / 1000 / windowSeconds);
    const key = `ratelimit:${ip}:${bucket}`;

    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - count));

    if (count > maxRequests) {
      res.setHeader("Retry-After", windowSeconds);
      return res.status(429).json({
        success: false,
        message: `Too many requests. Limit: ${maxRequests} per ${windowSeconds}s. Try again later.`,
      });
    }

    next();
  };
}
