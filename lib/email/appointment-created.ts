import 'server-only';

import { AuditAction, AuditEvent } from '@/lib/constants/audit-events';
import { sendEmail } from './send';

/**
 * Internal mailbox notified when a client books a meeting through the portal
 * (pront 1905: the team could not tell whether bookings reached them).
 * Overridable per environment; the default matches the seed constant.
 */
const NOTIFY_EMAIL =
  process.env.APPOINTMENT_NOTIFY_EMAIL ?? 'contato@sustentec-engenharia.com.br';

const ptDateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
});

/** Subject/notes are typed by the client — never interpolate them raw. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface SendAppointmentCreatedEmailParams {
  clientName: string;
  techName: string | null;
  startsAtIso: string;
  subject: string | null;
  notes: string | null;
}

/**
 * Notifies the Sustentec team that a portal appointment was created. Callers
 * run this OUTSIDE the appointment transaction and tolerate failures — a
 * broken mail provider must never undo or block a confirmed booking.
 */
export async function sendAppointmentCreatedEmail(
  params: SendAppointmentCreatedEmailParams,
): Promise<void> {
  const { startsAtIso } = params;
  const when = ptDateTime.format(new Date(startsAtIso));
  const clientName = escapeHtml(params.clientName);
  const techName = params.techName ? escapeHtml(params.techName) : null;
  const subject = params.subject ? escapeHtml(params.subject) : null;
  const notes = params.notes ? escapeHtml(params.notes) : null;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;max-width:560px;margin:auto;">
      <h2 style="color:#2d5a27;">Nova reunião agendada pelo portal</h2>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        <tbody>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;">Cliente</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${clientName}</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;">Responsável técnico</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${techName ?? '—'}</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;">Data e horário</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${when} (horário de Brasília)</td>
          </tr>
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:bold;">Assunto</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${subject ?? '—'}</td>
          </tr>
        </tbody>
      </table>
      ${notes ? `<p style="white-space:pre-line;"><strong>Mensagem do cliente:</strong><br/>${notes}</p>` : ''}
      <p style="color:#6b7280;font-size:12px;margin-top:24px;">
        Sustentec Engenharia — esta é uma mensagem automática do portal.
      </p>
    </div>
  `;

  await sendEmail({
    to: NOTIFY_EMAIL,
    subject: `Nova reunião agendada — ${clientName}`,
    html,
    audit: {
      sent: AuditAction.AppointmentNotifyEmailSent,
      failed: AuditAction.AppointmentNotifyEmailFailed,
      failedEvent: AuditEvent.AppointmentNotifyEmailFailed,
    },
  });
}
