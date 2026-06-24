'use client';

import { useState, useTransition } from 'react';

import { ResultCode } from '@/lib/constants/result-codes';
import { submitContact } from '@/modules/marketing/contact.controller';
import type {
  ContactSubmissionInput,
  ContactSubmissionResult,
} from '@/modules/marketing/contact.schema';

/**
 * Client hook wrapping `submitContact`. The contact form reaches the backend
 * only through this hook.
 *
 * `mutate` resolves with the same `ContactSubmissionResult` the form branches
 * on (so toasts + reset + validation handling stay identical). `pending`
 * mirrors the action's in-flight state; `error` captures an unexpected throw.
 */
export function useSubmitContact() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mutate(
    input: ContactSubmissionInput,
  ): Promise<ContactSubmissionResult> {
    return new Promise((resolve) => {
      startTransition(async () => {
        setError(null);
        try {
          resolve(await submitContact(input));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'error');
          resolve({ ok: false, code: ResultCode.ServerError });
        }
      });
    });
  }

  return { mutate, pending, error };
}
