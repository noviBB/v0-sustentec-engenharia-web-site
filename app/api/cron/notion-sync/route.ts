import { NextResponse } from 'next/server';

import { NotionRouteError } from '@/lib/constants/result-codes';
import { serverEnv } from '@/lib/env.server';
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
 */
export async function GET(request: Request): Promise<NextResponse> {
  const auth = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${serverEnv.CRON_SECRET}`;
  if (auth !== expected) {
    return NextResponse.json(
      { error: NotionRouteError.Unauthorized },
      { status: 401 },
    );
  }

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
