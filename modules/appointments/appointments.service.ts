import 'server-only';

import { AuditEvent } from '@/lib/constants/audit-events';
import { ResultCode } from '@/lib/constants/result-codes';
import { sendAppointmentCreatedEmail } from '@/lib/email/appointment-created';
import type { SessionLike } from '@/lib/db';
import { createAppointment as insertAppointment } from './appointments.repo';
import {
  getResponsibleTechEmail,
  getResponsibleTechName,
} from './responsible-techs.repo';
import type { CreateAppointmentInput } from './appointment.schema';

/**
 * Domain result of the booking orchestration. Deliberately NOT a `ResultCode`
 * — the controller maps these `kind`s onto the wire-level `ResultCode` enum.
 *
 *  - `ok`           — appointment committed (`id` is its primary key)
 *  - `double_booked`— unique-violation: same tech, same slot
 *  - `unauthorized` — RLS rejected the INSERT (stale session / missing link)
 *  - `error`        — anything else; `ref` is the 8-char correlation id logged
 *                     by the repo for support lookups
 */
export type CreateAppointmentDomainResult =
  | { kind: 'ok'; id: string }
  | { kind: 'double_booked' }
  | { kind: 'unauthorized' }
  | { kind: 'error'; ref?: string };

export interface CreateAppointmentDeps {
  session: SessionLike;
  clientId: string;
  clientName: string;
}

/**
 * Orchestrates booking an appointment for a tenant:
 *   1. Persists the appointment via the repo (RLS-scoped, audited in-tx).
 *   2. On success, resolves the tech display name (client-readable) and email
 *      (service-only column) and sends the team notification email.
 *
 * The email is a best-effort side-effect fired AFTER the booking is committed:
 * a mail-provider failure is logged (audit event) but never changes the
 * returned result — a confirmed booking must not be undone by a broken inbox.
 */
export async function createAppointment(
  deps: CreateAppointmentDeps,
  input: CreateAppointmentInput,
): Promise<CreateAppointmentDomainResult> {
  const { session, clientId, clientName } = deps;

  const result = await insertAppointment(session, clientId, {
    responsible_tech_id: input.responsible_tech_id,
    title: input.subject,
    description: input.notes ?? null,
    starts_at: new Date(input.scheduled_for),
    ends_at: null,
    process_id: null,
  });

  if (!result.ok) {
    if (result.code === ResultCode.DoubleBooked) {
      return { kind: 'double_booked' };
    }
    if (result.code === ResultCode.Unauthorized) {
      return { kind: 'unauthorized' };
    }
    return { kind: 'error', ref: result.ref };
  }

  // Notify the team mailbox. The appointment is already committed — an email
  // failure is audited here but never changes the result.
  try {
    const techName = await getResponsibleTechName(
      session,
      input.responsible_tech_id,
    );
    // Read via the service connection — the `email` column is locked to the
    // client role by column-level grants.
    const techEmail = await getResponsibleTechEmail(input.responsible_tech_id);
    await sendAppointmentCreatedEmail({
      clientName,
      techName,
      techEmail,
      startsAtIso: input.scheduled_for,
      subject: input.subject,
      notes: input.notes ?? null,
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

  return { kind: 'ok', id: result.id };
}
