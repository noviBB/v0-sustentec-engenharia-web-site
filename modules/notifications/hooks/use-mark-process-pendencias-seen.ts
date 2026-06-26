'use client';

import { useState, useTransition } from 'react';

import { ResultCode } from '@/lib/constants/result-codes';
import {
  markProcessPendenciasSeenAction,
  type MarkProcessPendenciasSeenResult,
} from '@/modules/notifications/notifications.controller';

export function useMarkProcessPendenciasSeen() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mutate(processId: string): Promise<MarkProcessPendenciasSeenResult> {
    return new Promise((resolve) => {
      startTransition(async () => {
        setError(null);
        try {
          resolve(await markProcessPendenciasSeenAction(processId));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'error');
          resolve({ ok: false, code: ResultCode.ServerError });
        }
      });
    });
  }

  return { mutate, pending, error };
}
