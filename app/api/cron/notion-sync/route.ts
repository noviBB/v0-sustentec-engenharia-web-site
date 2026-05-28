import { NextResponse } from 'next/server';

import { requireCronAuth } from '@/app/api/cron/_shared/auth';
import { NotionRouteError } from '@/lib/constants/result-codes';
import { runScheduledSync } from '@/lib/notion/cron';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Vercel cron entry point — wired up in `vercel.json` at `* /15 * * * *`.
 *
 *   GET /api/cron/notion-sync
 *   Authorization: Bearer $CRON_SECRET
 *
 * Vercel cron invocations are HTTP GETs that carry the bearer token. The
 * handler delegates to `runScheduledSync()` from `lib/notion/cron.ts`; that
 * orchestrator catches per-client Notion failures (429/5xx etc.) so one bad
 * client doesn't abort the run. Errors surface in `clients[].error`.
 *
 * Bearer-auth comparison is constant-time via the shared
 * `requireCronAuth` helper (see `app/api/cron/_shared/auth.ts`).
 */
export async function GET(request: Request): Promise<Response> {
  const fail = requireCronAuth(request);
  if (fail) return fail;

  try {
    const { clients } = await runScheduledSync();
    return NextResponse.json({ ok: true, clients });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({
        event: 'notion_cron_sync_failed',
        error: message,
      }),
    );
    return NextResponse.json(
      { error: NotionRouteError.SyncFailed, message },
      { status: 500 },
    );
  }
}
