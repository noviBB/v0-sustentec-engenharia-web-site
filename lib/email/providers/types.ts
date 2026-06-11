import 'server-only';

/**
 * Provider contract for the email service. A provider does exactly one
 * thing — transmit a single fully-assembled message — and knows nothing
 * about default From addresses, audit logging, or failure tolerance.
 * Those cross-cutting concerns live in the facade (`lib/email/send.ts`).
 */
export interface OutgoingEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface EmailProvider {
  /** Transmit one message. Throws on transport failure. */
  send(msg: OutgoingEmail): Promise<{ messageId: string | null }>;
}
