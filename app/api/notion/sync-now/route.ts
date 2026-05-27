import { NextResponse } from 'next/server';

import { AuditEvent } from '@/lib/constants/audit-events';
import { NotionRouteError } from '@/lib/constants/result-codes';
import { serverEnv } from '@/lib/env.server';
import { syncClient, NotionTokenMissingError } from '@/lib/notion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Manual sync trigger.
 *
 *   POST /api/notion/sync-now?client=<clientId>
 *   Authorization: Bearer $CRON_SECRET
 *
 * - 401 when the bearer secret is missing/wrong.
 * - 400 when `?client` is absent.
 * - 503 when NOTION_INTEGRATION_TOKEN is unset (validated lazily by the
 *   adapter — never at build/module load).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${serverEnv.CRON_SECRET}`;
  if (auth !== expected) {
    return NextResponse.json(
      { error: NotionRouteError.Unauthorized },
      { status: 401 },
    );
  }

  const clientId = new URL(request.url).searchParams.get('client');
  if (!clientId) {
    return NextResponse.json(
      { error: 'missing required ?client=<clientId>' },
      { status: 400 },
    );
  }

  try {
    const result = await syncClient(clientId);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    if (e instanceof NotionTokenMissingError) {
      return NextResponse.json(
        { error: NotionRouteError.NotionTokenMissing, message: e.message },
        { status: 503 },
      );
    }
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({
        event: AuditEvent.NotionSyncNowFailed,
        client_id: clientId,
        error: message,
      }),
    );
    return NextResponse.json(
      { error: NotionRouteError.SyncFailed, message },
      { status: 500 },
    );
  }
}
