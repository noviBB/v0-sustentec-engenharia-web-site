'use client';

import { useState, useTransition } from 'react';

import { ResultCode } from '@/lib/constants/result-codes';
import { updateClientAction } from '@/modules/clients/clients.controller';
import type {
  ClientCadastralInput,
  ClientCadastralResult,
} from '@/modules/clients/client.schema';

/**
 * Client hook wrapping `updateClientAction`. The cadastral edit form talks to
 * the backend only through this hook.
 *
 * `mutate` resolves with the same `ClientCadastralResult` the form switches on
 * (so the optimistic merge + toasts are preserved). `pending` replaces the
 * form's local `useTransition` flag; `error` captures an unexpected throw.
 */
export function useUpdateCadastral() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mutate(
    input: ClientCadastralInput,
  ): Promise<ClientCadastralResult> {
    return new Promise((resolve) => {
      startTransition(async () => {
        setError(null);
        try {
          resolve(await updateClientAction(input));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'error');
          resolve({ ok: false, code: ResultCode.ServerError });
        }
      });
    });
  }

  return { mutate, pending, error };
}
