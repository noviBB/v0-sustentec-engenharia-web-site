'use client';

import { useState, useTransition } from 'react';

import { ResultCode } from '@/lib/constants/result-codes';
import { createAppointmentAction } from '@/modules/appointments/appointments.controller';
import type {
  CreateAppointmentInput,
  CreateAppointmentResult,
} from '@/modules/appointments/appointment.schema';

/**
 * Client hook wrapping `createAppointmentAction`. The frontend reaches the
 * backend only through this hook — never the controller directly.
 *
 * `mutate` resolves with the same `CreateAppointmentResult` the form branches
 * on, so toast/validation/result handling stays identical. `pending` mirrors
 * the action's in-flight state; `error` captures an unexpected throw.
 */
export function useCreateAppointment() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function mutate(
    input: CreateAppointmentInput,
  ): Promise<CreateAppointmentResult> {
    return new Promise((resolve) => {
      startTransition(async () => {
        setError(null);
        try {
          resolve(await createAppointmentAction(input));
        } catch (e) {
          setError(e instanceof Error ? e.message : 'error');
          resolve({ ok: false, code: ResultCode.ServerError });
        }
      });
    });
  }

  return { mutate, pending, error };
}
