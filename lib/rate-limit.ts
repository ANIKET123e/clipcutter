import { redis } from './redis';
import { Errors } from './errors';

/**
 * Fixed-window rate limiter backed by Redis (INCR + EXPIRE). Good enough for
 * per-minute API/auth/upload/job/download limits without extra infra.
 */
export async function enforceRateLimit(key: string, limitPerMinute: number) {
  const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / 60000)}`;
  const count = await redis.incr(windowKey);
  if (count === 1) {
    await redis.expire(windowKey, 60);
  }
  if (count > limitPerMinute) {
    throw Errors.rateLimited();
  }
}

export function clientKeyFrom(req: Request, userId?: string | null) {
  if (userId) return `user:${userId}`;
  const fwd = req.headers.get('x-forwarded-for');
  return `ip:${fwd?.split(',')[0]?.trim() ?? 'unknown'}`;
}
