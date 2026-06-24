import 'server-only';
import { ResultCode } from '@/lib/constants/result-codes';
import { ResultKind } from '@/lib/enums';
import type { SessionLike } from '@/lib/db';
import { markMessageRead } from '@/modules/messages/messages.repo';

/**
 * Domain result for marking a message as read. Deliberately framework- and
 * ResultCode-free: the controller maps this `{ kind }` shape onto the wire
 * `ResultCode` contract. `ref` is the correlation id surfaced on errors.
 */
export type MarkMessageReadResult =
  | { kind: ResultKind.Ok }
  | { kind: ResultKind.NotFound }
  | { kind: ResultKind.Error; ref: string };

/**
 * Orchestrates marking one of a client's messages as read. The read is
 * tenant-scoped: the repository UPDATE is filtered by `clientId` (and RLS),
 * so a message id belonging to another tenant resolves to `not_found`
 * rather than mutating anything.
 *
 * Pure orchestration — no auth, no Next.js, no Supabase. Translates the
 * repository's `ResultCode`-tagged result into the domain `{ kind }` shape.
 */
export async function markMessageReadForClient(
  session: SessionLike,
  clientId: string,
  messageId: string,
): Promise<MarkMessageReadResult> {
  const result = await markMessageRead(session, clientId, messageId);
  if (result.ok) {
    return { kind: ResultKind.Ok };
  }
  if (result.code === ResultCode.NotFound) {
    return { kind: ResultKind.NotFound };
  }
  return { kind: ResultKind.Error, ref: result.ref };
}
