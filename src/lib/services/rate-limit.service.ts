/**
 * Simple in-memory token-bucket rate limiter.
 *
 * KNOWN LIMITATION: state lives in process memory, so it resets on
 * every deploy/restart and is NOT shared across multiple server
 * instances (e.g. serverless functions, horizontally-scaled
 * containers). This is fine for a single always-on Node process, but
 * for a real multi-instance production deployment, replace the
 * in-memory Map below with a shared store (Redis / Upstash / Vercel
 * KV) behind the same `checkRateLimit` signature — every caller
 * elsewhere in the app is unaffected by that swap.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}

/** Test/ops utility — not used by production code paths. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
