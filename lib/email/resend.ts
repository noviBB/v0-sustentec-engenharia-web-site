import 'server-only';
import { Resend } from 'resend';

import { AuditAction, AuditEvent } from '@/lib/constants/audit-events';
import { insertAuditLog } from '@/lib/db/auditLog';

/**
 * Thin wrapper over the Resend SDK. Centralizes the from-address, the
 * credential check, and the audit-log emission so call sites stay tight.
 *
 * Reads `RESEND_API_KEY` lazily (not via `lib/config.ts`) — the cron and
 * client portal don't strictly require email, and `pnpm build` should not
 * fail when the key is absent. Throws a clear error if the key is missing
 * *at send time*.
 *
 * Ops will configure a real verified domain; the placeholder below is fine
 * for development.
 */
const DEFAULT_FROM = 'Sustentec <no-reply@sustentec.example>';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  /** Audit actions/event for this email category. Defaults to the
   * payment-overdue values (the original call site). */
  audit?: {
    sent: AuditAction;
    failed: AuditAction;
    failedEvent: AuditEvent;
  };
}

let cachedClient: Resend | null = null;

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      'RESEND_API_KEY is not set — cannot send email. Configure the env var or stub email in dev.',
    );
  }
  if (!cachedClient) {
    cachedClient = new Resend(key);
  }
  return cachedClient;
}

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const {
    to,
    subject,
    html,
    from = DEFAULT_FROM,
    audit = {
      sent: AuditAction.PaymentOverdueEmailSent,
      failed: AuditAction.PaymentOverdueEmailFailed,
      failedEvent: AuditEvent.PaymentOverdueEmailFailed,
    },
  } = params;
  try {
    const resend = getResend();
    const result = await resend.emails.send({ from, to, subject, html });
    if (result.error) {
      throw new Error(
        `Resend send failed: ${result.error.message ?? 'unknown error'}`,
      );
    }
    await insertAuditLog({
      action: audit.sent,
      entity_type: 'email',
      after: { to, subject, message_id: result.data?.id ?? null },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      JSON.stringify({
        event: audit.failedEvent,
        to,
        subject,
        error: message,
      }),
    );
    await insertAuditLog({
      action: audit.failed,
      entity_type: 'email',
      after: { to, subject, error: message },
    }).catch(() => {
      // Avoid masking the original error if audit logging itself fails.
    });
    throw e;
  }
}
