import 'server-only';
import { randomUUID } from 'node:crypto';
import { AuditEvent } from '@/lib/constants/audit-events';
import { ResultKind } from '@/lib/enums';
import type { SessionLike } from '@/lib/db';
import { markPendenciasSeen as markPendenciasSeenRepo } from './notifications.repo';

export type MarkPendenciasSeenResult =
  | { kind: ResultKind.Ok }
  | { kind: ResultKind.Error; ref?: string };

export async function markPendenciasSeen(
  session: SessionLike,
  clientId: string,
): Promise<MarkPendenciasSeenResult> {
  try {
    await markPendenciasSeenRepo(session, clientId);
    return { kind: ResultKind.Ok };
  } catch (err) {
    const ref = randomUUID().slice(0, 8);
    console.error(
      JSON.stringify({
        event: AuditEvent.MarkPendenciasSeenFailed,
        ref,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return { kind: ResultKind.Error, ref };
  }
}
