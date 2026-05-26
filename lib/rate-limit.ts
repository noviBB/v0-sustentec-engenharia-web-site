import 'server-only';

/**
 * Minimal in-memory rate limiter (v1).
 *
 * Keys are normally an IP address or email. Each key is mapped to the
 * timestamp (ms) of the most recent successful "hit". A subsequent call
 * to `check` within `windowMs` returns false (rate limited).
 *
 * Note: this only protects a single Node.js process. Once we run behind
 * multiple instances we need a shared store (Redis, Upstash, etc.).
 */

const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

const hits = new Map<string, number>();

function sweep(now: number, windowMs: number) {
  // Best-effort GC so the map doesn't grow unbounded.
  for (const [key, ts] of hits) {
    if (now - ts > windowMs) hits.delete(key);
  }
}

/**
 * Returns true if the call is allowed and records the hit; false if the
 * key is still within the cooldown window.
 */
export function check(key: string, windowMs: number = DEFAULT_WINDOW_MS): boolean {
  const now = Date.now();
  const last = hits.get(key);

  if (last !== undefined && now - last < windowMs) {
    return false;
  }

  hits.set(key, now);
  // Cheap occasional sweep.
  if (hits.size > 500) sweep(now, windowMs);
  return true;
}

/**
 * Convenience helper: checks multiple keys atomically. If any key is
 * rate-limited, no hits are recorded and false is returned.
 */
export function checkAll(keys: string[], windowMs: number = DEFAULT_WINDOW_MS): boolean {
  const now = Date.now();
  for (const key of keys) {
    const last = hits.get(key);
    if (last !== undefined && now - last < windowMs) return false;
  }
  for (const key of keys) {
    hits.set(key, now);
  }
  return true;
}
