import { createHmac, timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { AuditAction } from '@/lib/constants/audit-events';
import { insertAuditLog } from '@/lib/db/auditLog';
import { serverEnv } from '@/lib/env.server';
import { handleWebhook, NotionTokenMissingError } from '@/lib/notion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Wire-format error codes for `POST /api/notion/webhook`.
 *
 * Co-located with the route (mirrors the `CronRouteError` pattern in
 * `app/api/cron/_shared/auth.ts`) rather than extending the cron-shared
 * module — the auth models differ (HMAC body signature vs bearer header),
 * and this route is the only HMAC consumer right now. If/when a second
 * HMAC route appears, lift `verifyHmac` into `_shared/`.
 */
enum WebhookRouteError {
  Unauthorized = 'unauthorized',
  SecretMissing = 'secret_missing',
  InvalidPayload = 'invalid_payload',
  ServerError = 'server_error',
}

/**
 * Constant-time HMAC-SHA256 verification of a raw request body.
 *
 * - Length-checks the received hex string before `timingSafeEqual` (which
 *   throws on length mismatch).
 * - Compares fixed-length buffers — leaks only the (constant) length of the
 *   signature, never the contents.
 */
function verifyHmac(raw: string, secret: string, received: string): boolean {
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  if (received.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(received, 'hex'),
      Buffer.from(expected, 'hex'),
    );
  } catch {
    // Non-hex input or any other Buffer-construction error → reject.
    return false;
  }
}

interface ParsedEvent {
  type: string;
  pageId: string | null;
}

function parseEvent(raw: string): ParsedEvent | null {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof json !== 'object' || json === null) return null;
  const obj = json as Record<string, unknown>;
  const type = typeof obj.type === 'string' ? obj.type : null;
  if (!type) return null;
  // Notion's `page.updated` payload places the page id at `data.id`.
  const data =
    typeof obj.data === 'object' && obj.data !== null
      ? (obj.data as Record<string, unknown>)
      : null;
  const pageId = data && typeof data.id === 'string' ? data.id : null;
  return { type, pageId };
}

/**
 * `POST /api/notion/webhook` — real-time Notion `page.updated` handler.
 *
 * Authenticated by HMAC-SHA256(NOTION_WEBHOOK_SECRET, raw body) compared
 * constant-time against the `X-Notion-Signature` header. The cron at
 * `/api/cron/notion-sync` remains the backstop on webhook outages.
 *
 * Responses:
 *   - 401 — bad / missing signature.
 *   - 503 — `NOTION_WEBHOOK_SECRET` unset (Notion stops retrying; cron
 *           backstop continues).
 *   - 400 — body not parseable as the expected `{ type, data: { id } }`.
 *   - 200 — success, dedup, or unsupported event (idempotent no-op).
 *   - 500 — internal error during sync (shared error envelope).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secret = serverEnv.NOTION_WEBHOOK_SECRET ?? '';
  if (secret.length === 0) {
    return NextResponse.json(
      { error: WebhookRouteError.SecretMissing },
      { status: 503 },
    );
  }

  // Need the raw bytes for HMAC — `request.json()` would discard them.
  const raw = await request.text();
  const received = request.headers.get('x-notion-signature') ?? '';

  if (!verifyHmac(raw, secret, received)) {
    return NextResponse.json(
      { error: WebhookRouteError.Unauthorized },
      { status: 401 },
    );
  }

  const event = parseEvent(raw);
  if (!event || !event.pageId) {
    return NextResponse.json(
      { error: WebhookRouteError.InvalidPayload },
      { status: 400 },
    );
  }

  // Audit every authenticated, parseable delivery — even unsupported types
  // and unknown pages — so operators can reconstruct the timeline.
  await insertAuditLog({
    action: AuditAction.NotionWebhookReceived,
    entity_type: 'notion_page',
    entity_id: event.pageId,
    after: { event_type: event.type, page_id: event.pageId },
  });

  if (event.type !== 'page.updated') {
    await insertAuditLog({
      action: AuditAction.NotionWebhookRejected,
      entity_type: 'notion_page',
      entity_id: event.pageId,
      after: {
        reason: 'unsupported_event_type',
        event_type: event.type,
        page_id: event.pageId,
      },
    });
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const outcome = await handleWebhook(event.pageId);

    if (outcome.deduped && outcome.reason === 'unknown_page') {
      await insertAuditLog({
        action: AuditAction.NotionWebhookRejected,
        entity_type: 'notion_page',
        entity_id: event.pageId,
        after: { reason: 'unknown_database', page_id: event.pageId },
      });
      return NextResponse.json({ ok: true, deduped: true, reason: outcome.reason });
    }

    if (outcome.deduped) {
      return NextResponse.json({ ok: true, deduped: true, reason: outcome.reason });
    }

    await insertAuditLog({
      action: AuditAction.NotionWebhookSyncedPage,
      entity_type: 'notion_page',
      entity_id: event.pageId,
      after: {
        page_id: event.pageId,
        client_id: outcome.client_id ?? null,
        process_id: outcome.process_id ?? null,
      },
    });
    return NextResponse.json({ ok: true, deduped: false, synced: true });
  } catch (e) {
    if (e instanceof NotionTokenMissingError) {
      return NextResponse.json(
        { error: WebhookRouteError.ServerError, message: e.message },
        { status: 503 },
      );
    }
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({
        event: 'notion_webhook_failed',
        page_id: event.pageId,
        error: message,
      }),
    );
    return NextResponse.json(
      { error: WebhookRouteError.ServerError, message },
      { status: 500 },
    );
  }
}
