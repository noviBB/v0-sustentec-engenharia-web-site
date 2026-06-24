'use client';

import { useState, useTransition } from 'react';

import { ResultCode } from '@/lib/constants/result-codes';
import {
  markMessageReadAction,
  type MarkMessageReadResult,
} from '@/modules/messages/messages.controller';

/**
 * Client hook wrapping `markMessageReadAction`. The messages view reaches the
 * backend only through this hook.
 *
 * `mutate` resolves with the same `MarkMessageReadResult` the view branches on
 * (so the optimistic update / rollback / toast logic is preserved). `pending`
 * mirrors the action's in-flight state; `error` captures an unexpected throw.
 */
export function useMarkRead() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mutate(messageId: string): Promise<MarkMessageReadResult> {
    return new Promise((resolve) => {
      startTransition(async () => {
        setError(null);
        try {
          resolve(await markMessageReadAction(messageId));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'error');
          resolve({ ok: false, code: ResultCode.ServerError, ref: '' });
        }
      });
    });
  }

  return { mutate, pending, error };
}
