import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import type { EmailProvider, OutgoingEmail } from './types';

/** nodemailer's bare `Transporter` defaults its info to `any`; pin it to the
 *  SMTP transport's typed `SentMessageInfo` so `info.messageId` is `string`. */
type SmtpTransporter = Transporter<SMTPTransport.SentMessageInfo>;

/**
 * SMTP provider — talks to the team's own mail server via nodemailer.
 *
 * Env vars (read lazily at send time, never via `lib/config.ts`, so
 * `pnpm build` and the cron route work without email configured):
 *   SMTP_HOST    required at send time
 *   SMTP_PORT    default 587
 *   SMTP_SECURE  'true' → implicit TLS (465-style); otherwise STARTTLS
 *                upgrade when the server offers it
 *   SMTP_USER /
 *   SMTP_PASS    optional — omitted entirely when unset (the local
 *                Inbucket test server at 127.0.0.1:54325 needs no auth)
 *
 * No connection pooling: sends run inside serverless functions, so a
 * one-shot transport per runtime instance is the right shape.
 */
let cachedTransporter: SmtpTransporter | null = null;

function getTransporter(): SmtpTransporter {
  const host = process.env.SMTP_HOST;
  if (!host) {
    throw new Error(
      'SMTP_HOST is not set — cannot send email. Configure the SMTP_* env vars ' +
        'or point them at the local Inbucket test server (127.0.0.1:54325).',
    );
  }
  if (!cachedTransporter) {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    cachedTransporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }
  return cachedTransporter;
}

export const smtpProvider: EmailProvider = {
  async send(msg: OutgoingEmail): Promise<{ messageId: string | null }> {
    const info = await getTransporter().sendMail({
      from: msg.from,
      to: msg.to,
      ...(msg.cc ? { cc: msg.cc } : {}),
      subject: msg.subject,
      html: msg.html,
    });
    return { messageId: info.messageId ?? null };
  },
};
