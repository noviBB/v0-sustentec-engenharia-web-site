'use server';
import 'server-only';

import { requireClient } from '@/lib/auth/tenant';
import { ResultCode } from '@/lib/constants/result-codes';
import { markMessageReadSchema } from '@/modules/messages/message.schema';
import { markMessageReadForClient } from '@/modules/messages/messages.service';

/**
 * Wire contract for the mark-read action. This is the serialization-safe
 * shape the client component switches on; the controller maps the service's
 * domain `{ kind }` result onto these `ResultCode`s.
 */
export type MarkMessageReadResult =
  | { ok: true }
  | { ok: false; code: ResultCode.Unauthorized | ResultCode.NotFound }
  | { ok: false; code: ResultCode.ServerError; ref: string };

/**
 * Server action — marks one of the signed-in user's messages as read.
 *
 * Flow: validate the id (zod uuid) → `requireClient()` (tenant scope) →
 * call the service once → map the domain result to a `ResultCode`. A
 * malformed id and a cross-tenant id both surface as `not_found` so we
 * never leak the difference. The UPDATE runs under the caller's RLS session.
 */
export async function markMessageReadAction(
  messageId: string,
): Promise<MarkMessageReadResult> {
  // Cheap input validation first — fail fast before any auth/DB work.
  const parsed = markMessageReadSchema.safeParse({ messageId });
  if (!parsed.success) {
    return { ok: false, code: ResultCode.NotFound };
  }

  const ctx = await requireClient();
  if (!ctx.ok) {
    return { ok: false, code: ResultCode.Unauthorized };
  }

  const result = await markMessageReadForClient(
    ctx.session,
    ctx.client.id,
    parsed.data.messageId,
  );
  switch (result.kind) {
    case 'ok':
      return { ok: true };
    case 'not_found':
      return { ok: false, code: ResultCode.NotFound };
    case 'error':
      return { ok: false, code: ResultCode.ServerError, ref: result.ref };
  }
}
