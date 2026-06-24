'use server';
import 'server-only';

import { requireClient } from '@/lib/auth/tenant';
import { ResultCode } from '@/lib/constants/result-codes';
import { ResultKind } from '@/lib/enums';
import { markPendenciasSeen } from './notifications.service';

export type MarkPendenciasSeenResult =
  | { ok: true }
  | { ok: false; code: ResultCode };

export async function markPendenciasSeenAction(): Promise<MarkPendenciasSeenResult> {
  const ctx = await requireClient();
  if (!ctx.ok) {
    return { ok: false, code: ResultCode.Unauthorized };
  }

  const result = await markPendenciasSeen(ctx.session, ctx.client.id);
  switch (result.kind) {
    case ResultKind.Ok:
      return { ok: true };
    default:
      return { ok: false, code: ResultCode.ServerError };
  }
}
