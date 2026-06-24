'use client';

import { useState, useTransition } from 'react';

import { ResultCode } from '@/lib/constants/result-codes';
import {
  markPendenciasSeenAction,
  type MarkPendenciasSeenResult,
} from '@/modules/notifications/notifications.controller';

export function useMarkPendenciasSeen() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mutate(): Promise<MarkPendenciasSeenResult> {
    return new Promise((resolve) => {
      startTransition(async () => {
        setError(null);
        try {
          resolve(await markPendenciasSeenAction());
        } catch (e) {
          setError(e instanceof Error ? e.message : 'error');
          resolve({ ok: false, code: ResultCode.ServerError });
        }
      });
    });
  }

  return { mutate, pending, error };
}
