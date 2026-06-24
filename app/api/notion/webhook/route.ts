import { createHmac, timingSafeEqual } from 'node:crypto';

import { NextResponse } from 'next/server';

import { AuditAction } from '@/lib/constants/audit-events';
import { insertAuditLog } from '@/lib/db/auditLog';
import { serverEnv } from '@/lib/env.server';
import {
  handleWebhook,
  NotionTokenMissingError,
  webhookPayloadSchema,
} from '@/lib/notion';

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

/**
 * Best-effort audit-log writer for the internal-failure paths.
 *
 * The 500 / 503 internal-failure paths must surface the original error code
 * to Notion regardless of whether the audit insert succeeds. A `pg` hiccup
 * while writing the audit row should not turn a 503 into a 500, or mask the
 * root cause in the response logs.
 */
async function tryInsertFailureAudit(
  pageId: string,
  after: Record<string, unknown>,
): Promise<void> {
  try {
    await insertAuditLog({
      action: AuditAction.NotionWebhookFailed,
      entity_type: 'notion_page',
      entity_id: pageId,
      after,
    });
  } catch (auditErr) {
    const auditMessage =
      auditErr instanceof Error ? auditErr.message : String(auditErr);
    console.error(
      JSON.stringify({
        event: 'notion_webhook_audit_write_failed',
        page_id: pageId,
        error: auditMessage,
      }),
    );
  }
}

/**
 * Sanitize an exception message for the wire response.
 *
 * In production we collapse to a fixed string so unexpected Postgres /
 * driver errors can't leak query or constraint internals to the webhook
 * sender. The raw message is still preserved in `console.error` and in
 * the `audit_log.after.error_message` column for operator triage.
 */
function safeMessage(message: string): string {
  return process.env.NODE_ENV === 'production' ? 'internal_error' : message;
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
  // Validate the envelope with zod instead of casting to Record<string,unknown>.
  // Notion's `page.updated` payload places the page id at `data.id`.
  const result = webhookPayloadSchema.safeParse(json);
  if (!result.success) return null;
  const { type, data } = result.data;
  return { type, pageId: data?.id ?? null };
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
 *   - 503 — `NOTION_WEBHOOK_SECRET` unset, or `NotionTokenMissingError`
 *           (Notion stops retrying; cron backstop continues).
 *   - 400 — body not parseable as the expected `{ type, data: { id } }`.
 *   - 200 — success, dedup, or unsupported event (idempotent no-op).
 *   - 500 — internal error during sync (shared error envelope).
 *
 * The `message` field in 500 and 503 responses is sanitized to
 * `'internal_error'` in production to avoid surfacing query/constraint
 * internals to the webhook sender; raw messages remain in `console.error`
 * logs (operator-only) and in `audit_log.after.error_message`.
 *
 * Internal failures (the generic 500 path and the `NotionTokenMissingError`
 * 503 path) write a `NotionWebhookFailed` audit row before responding. The
 * audit write itself is best-effort — a DB hiccup there is logged but does
 * not mask the original error code returned to Notion.
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
      await tryInsertFailureAudit(event.pageId, {
        reason: 'token_missing',
        page_id: event.pageId,
      });
      return NextResponse.json(
        {
          error: WebhookRouteError.ServerError,
          message: safeMessage(e.message),
        },
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
    await tryInsertFailureAudit(event.pageId, {
      reason: 'internal_error',
      error_message: message,
      page_id: event.pageId,
    });
    return NextResponse.json(
      { error: WebhookRouteError.ServerError, message: safeMessage(message) },
      { status: 500 },
    );
  }
}
