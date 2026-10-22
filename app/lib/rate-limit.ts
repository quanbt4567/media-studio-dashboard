/**
 * Tiny in-memory sliding-window rate limiter for the login endpoint.
 *
 * Serverless instances each keep their own counters, so the effective
 * allowance is per-instance — still a large improvement over unlimited
 * password guessing, which is the threat this guards against.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function prune(now: number) {
  if (buckets.size < 1000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Milliseconds until the key's window resets, or 0 when not limited. */
export function rateLimitRetryAfter(key: string, limit: number): number {
  const bucket = buckets.get(key);
  if (!bucket) return 0;
  const now = Date.now();
  if (bucket.resetAt <= now) {
    buckets.delete(key);
    return 0;
  }
  return bucket.count >= limit ? bucket.resetAt - now : 0;
}

export function recordFailure(key: string, windowMs: number): void {
  const now = Date.now();
  prune(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    bucket.count += 1;
  }
}

export function clearFailures(key: string): void {
  buckets.delete(key);
}
