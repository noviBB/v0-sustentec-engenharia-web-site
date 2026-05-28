import 'server-only';

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Upstash-backed rate limiter for the contact form server action.
 *
 * Why Upstash: the marketing site runs on Vercel serverless, where an
 * in-memory Map does not survive cold starts. Upstash is HTTP-based and
 * durable across invocations, so a single submission window holds even when
 * each request lands on a fresh isolate.
 *
 * The limiter is constructed LAZILY on first call. Importing this module never
 * touches `process.env`, so a misconfigured deploy still boots — the first
 * submission warns + passes through (degraded mode) instead of crashing.
 *
 * Keying — composite "block on EITHER IP OR email" semantics:
 *   - The contact form is unauthenticated, so a single key class is too easy
 *     to bypass (vary the IP via mobile network, or vary the email between
 *     submissions). We run two independent fixed-window checks against the
 *     same Redis instance, one per identifier, and block if either fires.
 *   - Two Redis round-trips per check is fine: contact submissions are rare,
 *     and Upstash REST round-trips are ~30ms each.
 *
 * Window: 1 submission per 5 minutes per identifier. Tune via the limiter
 * config below; both checks share the same window for simplicity.
 */

const WINDOW = '5 m' as const;
const MAX_PER_WINDOW = 1;

type CachedLimiters = {
  byIp: Ratelimit;
  byEmail: Ratelimit;
};

let cached: CachedLimiters | null = null;

function getLimiters(): CachedLimiters | null {
  if (cached) return cached;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });

  cached = {
    byIp: new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(MAX_PER_WINDOW, WINDOW),
      analytics: false,
      prefix: 'contact-form:ip',
    }),
    byEmail: new Ratelimit({
      redis,
      limiter: Ratelimit.fixedWindow(MAX_PER_WINDOW, WINDOW),
      analytics: false,
      prefix: 'contact-form:email',
    }),
  };
  return cached;
}

export type RateLimitResult = { ok: true } | { ok: false };

/**
 * Check whether a contact-form submission should be allowed.
 *
 * Returns `{ ok: true }` when:
 *   - Upstash creds are unset (degraded mode — warn-logged on each block-pass).
 *   - Both the IP-hash window AND the email-hash window have room left.
 *
 * Returns `{ ok: false }` when EITHER identifier has already submitted within
 * the current window.
 */
export async function checkContactRateLimit(opts: {
  ipHash: string | null;
  emailHash: string;
}): Promise<RateLimitResult> {
  const limiters = getLimiters();
  if (!limiters) {
    console.warn(
      '[rate-limit] UPSTASH_REDIS_REST_URL/_TOKEN unset — contact form rate limiting disabled',
    );
    return { ok: true };
  }

  // Two parallel checks: block on EITHER match.
  const [ipResult, emailResult] = await Promise.all([
    limiters.byIp.limit(opts.ipHash ?? 'no-ip'),
    limiters.byEmail.limit(opts.emailHash),
  ]);

  if (!ipResult.success || !emailResult.success) {
    return { ok: false };
  }
  return { ok: true };
}
