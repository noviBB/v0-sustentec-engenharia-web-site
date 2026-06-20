import 'server-only';
import { Resend } from 'resend';

import type { EmailProvider, OutgoingEmail } from './types';

/**
 * Resend provider — the original SaaS transport, kept as a config-selectable
 * rollback path (`EMAIL_PROVIDER=resend`). Reads `RESEND_API_KEY` lazily at
 * send time so builds never require it.
 */
let cachedClient: Resend | null = null;

function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      'RESEND_API_KEY is not set — cannot send email via the resend provider. ' +
        'Configure the env var or switch EMAIL_PROVIDER to smtp.',
    );
  }
  if (!cachedClient) {
    cachedClient = new Resend(key);
  }
  return cachedClient;
}

export const resendProvider: EmailProvider = {
  async send(msg: OutgoingEmail): Promise<{ messageId: string | null }> {
    const result = await getResend().emails.send({
      from: msg.from,
      to: msg.to,
      ...(msg.cc ? { cc: msg.cc } : {}),
      subject: msg.subject,
      html: msg.html,
    });
    if (result.error) {
      throw new Error(
        `Resend send failed: ${result.error.message ?? 'unknown error'}`,
      );
    }
    return { messageId: result.data?.id ?? null };
  },
};
