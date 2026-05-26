import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from './index';
import { messages } from './schema';

export type MessageRow = typeof messages.$inferSelect;

export type MarkMessageReadResult =
  | { ok: true }
  | { ok: false; code: 'not_found' }
  | { ok: false; code: 'server_error'; ref: string };

/**
 * Per-tenant list of messages, newest first. Messages with a NULL `sent_at`
 * sort to the end via `nulls last` so the inbox stays predictable.
 *
 * Defaults to `LIMIT 200` so a runaway list doesn't blow up the RSC payload;
 * callers can paginate later by passing `{ limit, offset }`.
 */
export async function listMessagesForClient(
  clientId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<MessageRow[]> {
  const limit = opts.limit ?? 200;
  const offset = opts.offset ?? 0;
  return db
    .select()
    .from(messages)
    .where(eq(messages.client_id, clientId))
    .orderBy(sql`${messages.sent_at} desc nulls last`)
    .limit(limit)
    .offset(offset);
}

export async function countUnreadForClient(clientId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(eq(messages.client_id, clientId), eq(messages.read, false)));
  return row?.count ?? 0;
}

/**
 * Marks a tenant-scoped message as read. Wraps the UPDATE in a try/catch so
 * unexpected DB failures surface as a typed `server_error` (with an 8-char
 * correlation `ref` that the UI shows in the toast and we log to stderr).
 *
 * TODO(#22, read_at): AC expects `read_at = now()` but the current schema only has
 * a `read boolean` column. Track schema extension in issue #22.
 */
export async function markMessageRead(
  clientId: string,
  messageId: string,
): Promise<MarkMessageReadResult> {
  try {
    const updated = await db
      .update(messages)
      .set({ read: true })
      .where(and(eq(messages.id, messageId), eq(messages.client_id, clientId)))
      .returning({ id: messages.id });
    if (updated.length === 0) {
      return { ok: false, code: 'not_found' };
    }
    return { ok: true };
  } catch (err) {
    const ref = randomUUID().slice(0, 8);
    console.error(
      JSON.stringify({
        event: 'mark_message_read_failed',
        ref,
        clientId,
        messageId,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return { ok: false, code: 'server_error', ref };
  }
}
