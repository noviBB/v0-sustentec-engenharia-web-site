'use server';

import 'server-only';

import { requireClient } from '@/lib/auth/tenant';
import { ResultCode } from '@/lib/constants/result-codes';
import { ResultKind } from '@/lib/enums';
import {
  createAppointmentSchema,
  type CreateAppointmentResult,
} from './appointment.schema';
import { createAppointment } from './appointments.service';

/**
 * Server action — creates an appointment for the signed-in user's tenant.
 *
 * The controller owns the request concerns only: auth (`requireClient`), input
 * validation (Zod), and mapping the service's DOMAIN result onto the wire-level
 * `ResultCode`. All orchestration (persisting + the notification email) lives
 * in the service.
 *
 * Returns a typed result the form maps to a toast variant:
 *  - `validation`     — Zod failed (most likely a form-submit edge case)
 *  - `unauthorized`   — no auth user, no tenant link, or RLS rejected the write
 *  - `double_booked`  — same tech, same slot, already booked
 *  - `server_error`   — anything else, logged with an 8-char correlation ref
 */
export async function createAppointmentAction(
  input: unknown,
): Promise<CreateAppointmentResult> {
  const ctx = await requireClient();
  if (!ctx.ok) {
    return { ok: false, code: ResultCode.Unauthorized };
  }

  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: ResultCode.Validation };
  }

  const result = await createAppointment(
    {
      session: ctx.session,
      clientId: ctx.client.id,
      clientName: ctx.client.name,
    },
    parsed.data,
  );

  switch (result.kind) {
    case ResultKind.Ok:
      return { ok: true, id: result.id };
    case ResultKind.DoubleBooked:
      return { ok: false, code: ResultCode.DoubleBooked };
    case ResultKind.Unauthorized:
      return { ok: false, code: ResultCode.Unauthorized };
    default:
      return { ok: false, code: ResultCode.ServerError, ref: result.ref };
  }
}
