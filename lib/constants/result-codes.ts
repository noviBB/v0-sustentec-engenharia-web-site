/**
 * App-level result codes.
 *
 * These cross the Next.js server-action → client boundary: server actions and
 * DB helpers return `{ ok: false, code: ResultCode.* }`, and client components
 * switch on the value. String enums are used deliberately — at runtime each
 * member is a plain string, so it stays serialization-safe across that
 * boundary (a returned `code` compares `=== ResultCode.DoubleBooked`).
 *
 * NOTE: this is the single source of truth for these codes. Do NOT re-declare
 * them as inline string-unions or `as const` objects elsewhere — see
 * `docs/conventions.md` and the ESLint guard in `eslint.config.mjs`.
 *
 * Postgres column enums are a separate concern handled by Drizzle `pgEnum`
 * in `lib/db/enums.ts` — do not conflate the two.
 */
export enum ResultCode {
  Unauthorized = 'unauthorized',
  Validation = 'validation',
  DoubleBooked = 'double_booked',
  ServerError = 'server_error',
  NotFound = 'not_found',
  // The Upstash rate limiter is currently parked (#22) but the code is
  // referenced, so it stays modeled here.
  RateLimited = 'rate_limited',
}

/**
 * Route-specific HTTP error codes for the manual Notion sync endpoint
 * (`app/api/notion/sync-now/route.ts`). These are not part of the shared
 * server-action result contract, so they live in their own enum rather than
 * polluting `ResultCode`. `Unauthorized` intentionally mirrors
 * `ResultCode.Unauthorized`'s string value for a consistent wire format.
 */
export enum NotionRouteError {
  Unauthorized = 'unauthorized',
  NotionTokenMissing = 'notion_token_missing',
  SyncFailed = 'sync_failed',
}
