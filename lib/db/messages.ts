import 'server-only';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from './index';
import { messages } from './schema';

export type MessageRow = typeof messages.$inferSelect;

/**
 * Per-tenant list of messages, newest first. Messages with a NULL `sent_at`
 * sort to the end via `nulls last` so the inbox stays predictable.
 */
export async function listMessagesForClient(
  clientId: string,
): Promise<MessageRow[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.client_id, clientId))
    .orderBy(sql`${messages.sent_at} desc nulls last`);
}

export async function countUnreadForClient(clientId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(eq(messages.client_id, clientId), eq(messages.read, false)));
  return row?.count ?? 0;
}

export async function markMessageRead(
  clientId: string,
  messageId: string,
): Promise<{ ok: true } | { ok: false; code: 'not_found' }> {
  const updated = await db
    .update(messages)
    .set({ read: true })
    .where(and(eq(messages.id, messageId), eq(messages.client_id, clientId)))
    .returning({ id: messages.id });
  if (updated.length === 0) {
    return { ok: false, code: 'not_found' };
  }
  return { ok: true };
}
