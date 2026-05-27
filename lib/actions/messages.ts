'use server';

import { requireClient } from '@/lib/auth/tenant';
import { ResultCode } from '@/lib/constants/result-codes';
import { markMessageRead } from '@/lib/db/messages';

export type MarkMessageReadResult =
  | { ok: true }
  | { ok: false; code: ResultCode.Unauthorized | ResultCode.NotFound }
  | { ok: false; code: ResultCode.ServerError; ref: string };

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
    return { ok: false, code: ResultCode.NotFound };
  }

  const ctx = await requireClient();
  if (!ctx.ok) {
    return { ok: false, code: ResultCode.Unauthorized };
  }

  return markMessageRead(ctx.client.id, messageId);
}
