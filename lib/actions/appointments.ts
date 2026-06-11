'use server';

import { requireClient } from '@/lib/auth/tenant';
import { AuditEvent } from '@/lib/constants/audit-events';
import { ResultCode } from '@/lib/constants/result-codes';
import { createAppointment } from '@/lib/db/appointments';
import { getResponsibleTechName } from '@/lib/db/responsibleTechs';
import { sendAppointmentCreatedEmail } from '@/lib/email/appointment-created';
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
    return { ok: false, code: ResultCode.Unauthorized };
  }

  const parsed = createAppointmentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: ResultCode.Validation };
  }
  const data: CreateAppointmentInput = parsed.data;

  const result = await createAppointment(ctx.session, ctx.client.id, {
    responsible_tech_id: data.responsible_tech_id,
    title: data.subject,
    description: data.notes ?? null,
    starts_at: new Date(data.scheduled_for),
    ends_at: null,
    process_id: null,
  });

  if (result.ok) {
    // Notify the team mailbox. The appointment is already committed — an
    // email failure is audited by the helper but never changes the result.
    try {
      const techName = await getResponsibleTechName(
        ctx.session,
        data.responsible_tech_id,
      );
      await sendAppointmentCreatedEmail({
        clientName: ctx.client.name,
        techName,
        startsAtIso: data.scheduled_for,
        subject: data.subject,
        notes: data.notes ?? null,
      });
    } catch (e) {
      console.error(
        JSON.stringify({
          event: AuditEvent.AppointmentNotifyEmailFailed,
          appointment_id: result.id,
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  }

  return result;
}
