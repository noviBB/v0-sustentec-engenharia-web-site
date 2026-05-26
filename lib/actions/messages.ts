'use server';

import { createClient } from '@/lib/supabase/server';
import { getClientForUser } from '@/lib/auth/tenant';
import { markMessageRead } from '@/lib/db/messages';

export type MarkMessageReadResult =
  | { ok: true }
  | { ok: false; code: 'unauthorized' | 'not_found' };

/**
 * Server action — marks one of the signed-in user's messages as read.
 * Tenant-scoped via `getClientForUser`; cross-tenant message ids return
 * `not_found` rather than leaking the difference.
 */
export async function markMessageReadAction(
  messageId: string,
): Promise<MarkMessageReadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, code: 'unauthorized' };
  }

  const client = await getClientForUser(user.id);
  if (!client) {
    return { ok: false, code: 'unauthorized' };
  }

  if (typeof messageId !== 'string' || messageId.length === 0) {
    return { ok: false, code: 'not_found' };
  }

  return markMessageRead(client.id, messageId);
}
