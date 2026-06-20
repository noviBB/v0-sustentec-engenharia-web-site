import 'server-only';

import { AuditAction, AuditEvent } from '@/lib/constants/audit-events';
import { insertAuditLog } from '@/lib/db/auditLog';
import type { EmailProvider } from './providers/types';
import { smtpProvider } from './providers/smtp';
import { resendProvider } from './providers/resend';

/**
 * Provider-agnostic email facade. Owns every cross-cutting concern —
 * default From address, audit-log emission, structured failure logs and
 * throw-on-failure — while the actual transmission is delegated to a
 * provider selected by `EMAIL_PROVIDER` (default `smtp`).
 *
 * Providers (`lib/email/providers/`) implement one method,
 * `send(msg) → { messageId }`, and read their own credentials lazily at
 * send time. Nothing here goes through `lib/config.ts` build-time
 * validation on purpose: the cron and the portal don't strictly require
 * email, and `pnpm build` must succeed with no email env vars at all.
 *
 * Ops will configure a real verified From domain; the placeholder below is
 * fine for development (`EMAIL_FROM` overrides it).
 */
const PROVIDERS: Record<string, EmailProvider> = {
  smtp: smtpProvider,
  resend: resendProvider,
};

function getProvider(): EmailProvider {
  const name = process.env.EMAIL_PROVIDER ?? 'smtp';
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(
      `Unknown EMAIL_PROVIDER "${name}" — valid values: ${Object.keys(PROVIDERS).join(', ')}.`,
    );
  }
  return provider;
}

function defaultFrom(): string {
  return process.env.EMAIL_FROM ?? 'Sustentec <no-reply@sustentec.example>';
}

export interface SendEmailParams {
  to: string;
  /** Optional carbon-copy recipient, forwarded to the provider and audited. */
  cc?: string;
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

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const {
    to,
    cc,
    subject,
    html,
    from = defaultFrom(),
    audit = {
      sent: AuditAction.PaymentOverdueEmailSent,
      failed: AuditAction.PaymentOverdueEmailFailed,
      failedEvent: AuditEvent.PaymentOverdueEmailFailed,
    },
  } = params;
  try {
    const { messageId } = await getProvider().send({
      from,
      to,
      cc,
      subject,
      html,
    });
    await insertAuditLog({
      action: audit.sent,
      entity_type: 'email',
      after: { to, cc, subject, message_id: messageId },
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
      after: { to, cc, subject, error: message },
    }).catch(() => {
      // Avoid masking the original error if audit logging itself fails.
    });
    throw e;
  }
}
