'use server';

import { requireClient } from '@/lib/auth/tenant';
import { createAppointment } from '@/lib/db/appointments';
import {
  createAppointmentSchema,
  type CreateAppointmentInput,
  type CreateAppointmentResult,
} from '@/lib/schemas/appointment';

/**
 * Server action — creates an appointment for the signed-in user's tenant.
 *
 * Returns a typed result the form maps to a toast variant:
 *  - `validation`     — Zod failed (most likely a form-submit edge case)
 *  - `unauthorized`   — no auth user or no tenant link
 *  - `double_booked`  — same tech, same slot, already booked
 *  - `server_error`   — anything else, logged with an 8-char correlation ref
 */
export async function createAppointmentAction(
  input: unknown,
): Promise<CreateAppointmentResult> {
  const ctx = await requireClient();
  if (!ctx.ok) {
    return { ok: false, code: 'unauthorized' };
  }

  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'validation' };
  }
  const data: CreateAppointmentInput = parsed.data;

  const result = await createAppointment(ctx.client.id, {
    responsible_tech_id: data.responsible_tech_id,
    title: data.subject,
    description: data.notes ?? null,
    starts_at: new Date(data.scheduled_for),
    ends_at: null,
    process_id: null,
  });

  return result;
}
