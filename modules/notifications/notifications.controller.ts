'use server';
import 'server-only';

import { requireClient } from '@/lib/auth/tenant';
import { ResultCode } from '@/lib/constants/result-codes';
import { ResultKind } from '@/lib/enums';
import {
  markPendenciasSeen,
  markProcessPendenciasSeen,
} from './notifications.service';
import { markProcessPendenciasSeenSchema } from './notifications.schema';

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

export type MarkProcessPendenciasSeenResult =
  | { ok: true }
  | { ok: false; code: ResultCode };

export async function markProcessPendenciasSeenAction(
  processId: string,
): Promise<MarkProcessPendenciasSeenResult> {
  const ctx = await requireClient();
  if (!ctx.ok) {
    return { ok: false, code: ResultCode.Unauthorized };
  }

  const parsed = markProcessPendenciasSeenSchema.safeParse({ processId });
  if (!parsed.success) {
    return { ok: false, code: ResultCode.Validation };
  }

  const result = await markProcessPendenciasSeen(
    ctx.session,
    parsed.data.processId,
  );
  switch (result.kind) {
    case ResultKind.Ok:
      return { ok: true };
    default:
      return { ok: false, code: ResultCode.ServerError };
  }
}
