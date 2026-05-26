'use server';

import { requireClient } from '@/lib/auth/tenant';
import { markMessageRead } from '@/lib/db/messages';

export type MarkMessageReadResult =
  | { ok: true }
  | { ok: false; code: 'unauthorized' | 'not_found' }
  | { ok: false; code: 'server_error'; ref: string };

/**
 * Server action — marks one of the signed-in user's messages as read.
 * Tenant-scoped via `requireClient`; cross-tenant message ids return
 * `not_found` rather than leaking the difference.
 */
export async function markMessageReadAction(
  messageId: string,
): Promise<MarkMessageReadResult> {
  // Cheap input validation first — fail fast before any auth/DB work.
  if (typeof messageId !== 'string' || messageId.length === 0) {
    return { ok: false, code: 'not_found' };
  }

  const ctx = await requireClient();
  if (!ctx.ok) {
    return { ok: false, code: 'unauthorized' };
  }

  return markMessageRead(ctx.client.id, messageId);
}
