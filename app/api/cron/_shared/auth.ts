import { timingSafeEqual } from 'node:crypto';

import { serverEnv } from '@/lib/env.server';

/**
 * Wire-format error codes returned by cron HTTP route handlers.
 *
 * Cron endpoints are server-to-server (Vercel cron -> our `/api/cron/*`),
 * so these never cross to the browser — but they still live in an enum so
 * the JSON envelope stays consistent across routes. `Unauthorized`
 * intentionally mirrors the value used by `ResultCode.Unauthorized` and
 * `NotionRouteError.Unauthorized`.
 */
export enum CronRouteError {
  Unauthorized = 'unauthorized',
  ServerError = 'server_error',
}

/**
 * Constant-time `Authorization: Bearer <CRON_SECRET>` check for cron routes.
 *
 * Returns the 401 `Response` when the request should be rejected, or `null`
 * when auth passes. Length-checks both sides before calling
 * `timingSafeEqual`, which throws on length mismatch.
 *
 * Note: comparing buffers of equal length is constant-time; the explicit
 * length short-circuit leaks only the length of the SECRET (a constant) —
 * not the contents of either side.
 */
export function requireCronAuth(request: Request): Response | null {
  const secret = serverEnv.CRON_SECRET ?? '';
  const auth = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;

  if (secret.length === 0 || auth.length !== expected.length) {
    return Response.json(
      { error: CronRouteError.Unauthorized },
      { status: 401 },
    );
  }

  const ok = timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
  if (ok) return null;
  return Response.json(
    { error: CronRouteError.Unauthorized },
    { status: 401 },
  );
}
