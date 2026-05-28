import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { AuditEvent } from '@/lib/constants/audit-events';
import { ResultCode } from '@/lib/constants/result-codes';
import { dbRls, type SessionLike } from './index';
import { messages } from './schema';

export type MessageRow = typeof messages.$inferSelect;

export type MarkMessageReadResult =
  | { ok: true }
  | { ok: false; code: ResultCode.NotFound }
  | { ok: false; code: ResultCode.ServerError; ref: string };

/**
 * Per-tenant list of messages, newest first. Messages with a NULL `sent_at`
 * sort to the end via `nulls last` so the inbox stays predictable.
 *
 * RLS-scoped via `dbRls(session, ...)` — the `messages` policy joins through
 * `processes`/`user_clients` so a foreign-tenant `client_id` returns 0 rows.
 * The `WHERE client_id = ?` filter stays as a belt-and-braces seatbelt.
 *
 * Defaults to `LIMIT 200` so a runaway list doesn't blow up the RSC payload;
 * callers can paginate later by passing `{ limit, offset }`.
 */
export async function listMessagesForClient(
  session: SessionLike,
  clientId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<MessageRow[]> {
  const limit = opts.limit ?? 200;
  const offset = opts.offset ?? 0;
  return dbRls(session, async (tx) =>
    tx
      .select()
      .from(messages)
      .where(eq(messages.client_id, clientId))
      .orderBy(sql`${messages.sent_at} desc nulls last`)
      .limit(limit)
      .offset(offset),
  );
}

export async function countUnreadForClient(
  session: SessionLike,
  clientId: string,
): Promise<number> {
  return dbRls(session, async (tx) => {
    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .where(and(eq(messages.client_id, clientId), eq(messages.read, false)));
    return row?.count ?? 0;
  });
}

/**
 * Marks a tenant-scoped message as read. Wraps the UPDATE in a try/catch so
 * unexpected DB failures surface as a typed `server_error` (with an 8-char
 * correlation `ref` that the UI shows in the toast and we log to stderr).
 *
 * Sets both `read` and `read_at = now()` so the portal can render a "Lida em
 * …" tooltip without inferring the timestamp from the audit log.
 */
export async function markMessageRead(
  session: SessionLike,
  clientId: string,
  messageId: string,
): Promise<MarkMessageReadResult> {
  try {
    const updated = await dbRls(session, async (tx) =>
      tx
        .update(messages)
        .set({ read: true, read_at: sql`now()` })
        .where(and(eq(messages.id, messageId), eq(messages.client_id, clientId)))
        .returning({ id: messages.id }),
    );
    if (updated.length === 0) {
      return { ok: false, code: ResultCode.NotFound };
    }
    return { ok: true };
  } catch (err) {
    const ref = randomUUID().slice(0, 8);
    console.error(
      JSON.stringify({
        event: AuditEvent.MarkMessageReadFailed,
        ref,
        clientId,
        messageId,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return { ok: false, code: ResultCode.ServerError, ref };
  }
}
