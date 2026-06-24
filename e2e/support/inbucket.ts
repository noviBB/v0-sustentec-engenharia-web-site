/**
 * Mail helpers for e2e specs.
 *
 * The local Supabase stack runs **Mailpit** as its SMTP sink (older CLIs used
 * Inbucket — this file keeps the historical name but speaks Mailpit's API).
 * Mail sent by the app (EMAIL_PROVIDER=smtp -> SMTP_PORT=54325) is captured
 * there and read back over Mailpit's REST API on :54324. These helpers poll for
 * delivery, since mail arrives asynchronously after the triggering request
 * returns.
 *
 * Mailpit API: https://mailpit.axllent.org/docs/api-v1/
 */

import { z } from 'zod';

const MAILPIT_BASE_URL =
  process.env.MAILPIT_URL ?? process.env.INBUCKET_URL ?? 'http://127.0.0.1:54324';

/** Address entry shared by Mailpit summary and message payloads. */
const mailpitAddressSchema = z.object({
  Address: z.string(),
  Name: z.string(),
});

/** Raw message summary from `GET /api/v1/search` (Mailpit shape). */
const mailpitSummarySchema = z.object({
  ID: z.string(),
  Subject: z.string(),
  To: z.array(mailpitAddressSchema),
  From: mailpitAddressSchema,
  Created: z.string(),
});
export type MailpitSummary = z.infer<typeof mailpitSummarySchema>;

/** Envelope returned by `GET /api/v1/search` (Mailpit shape). */
const mailpitSearchResponseSchema = z.object({
  messages: z.array(mailpitSummarySchema).optional(),
});

/** Full message from `GET /api/v1/message/<ID>` (Mailpit shape). */
const mailpitMessageSchema = z.object({
  ID: z.string(),
  Subject: z.string(),
  To: z.array(mailpitAddressSchema),
  From: mailpitAddressSchema,
  Text: z.string(),
  HTML: z.string(),
});
export type MailpitMessage = z.infer<typeof mailpitMessageSchema>;

/** Normalised message returned to specs. */
export interface MailMessage {
  id: string;
  subject: string;
  from: string;
  to: string[];
  text: string;
  html: string;
}

/** Search messages addressed to `address`, newest first. */
async function searchByRecipient(address: string): Promise<MailpitSummary[]> {
  const url = `${MAILPIT_BASE_URL}/api/v1/search?query=${encodeURIComponent(
    `to:${address}`,
  )}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[mailpit] GET ${url} failed: ${res.status}`);
  }
  const data = mailpitSearchResponseSchema.parse(await res.json());
  return data.messages ?? [];
}

/** Fetch a single message's full contents by id. */
async function getMessage(id: string): Promise<MailMessage> {
  const url = `${MAILPIT_BASE_URL}/api/v1/message/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[mailpit] GET ${url} failed: ${res.status}`);
  }
  const m = mailpitMessageSchema.parse(await res.json());
  return {
    id: m.ID,
    subject: m.Subject,
    from: m.From?.Address ?? '',
    to: (m.To ?? []).map((t) => t.Address),
    text: m.Text ?? '',
    html: m.HTML ?? '',
  };
}

/**
 * Delete captured messages for test isolation.
 *
 * When `address` is given, deletes ONLY messages addressed to it (search by
 * `to:<address>`, collect IDs, then `DELETE /api/v1/messages` with a
 * `{ IDs: [...] }` body). This avoids wiping other workers' mail when running
 * locally in parallel. When `address` is undefined, falls back to clearing the
 * whole Mailpit store.
 */
export async function clearMailbox(address?: string): Promise<void> {
  const deleteUrl = `${MAILPIT_BASE_URL}/api/v1/messages`;

  if (address === undefined) {
    // Fallback: clear the entire store.
    const res = await fetch(deleteUrl, { method: 'DELETE' });
    if (!res.ok) {
      throw new Error(`[mailpit] DELETE ${deleteUrl} failed: ${res.status}`);
    }
    return;
  }

  const ids = (await searchByRecipient(address)).map((m) => m.ID);
  if (ids.length === 0) return; // nothing addressed to this recipient

  const res = await fetch(deleteUrl, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ IDs: ids }),
  });
  if (!res.ok) {
    throw new Error(`[mailpit] DELETE ${deleteUrl} (IDs) failed: ${res.status}`);
  }
}

export interface WaitForOptions {
  /** Max time to wait, in ms. Default 15000. */
  timeoutMs?: number;
  /** Poll interval, in ms. Default 500. */
  intervalMs?: number;
}

/**
 * Poll until at least one message addressed to `address` is present, then
 * return the newest one's full contents. Throws on timeout.
 */
export async function waitForLatestMessage(
  address: string,
  options: WaitForOptions = {},
): Promise<MailMessage> {
  const { timeoutMs = 15_000, intervalMs = 500 } = options;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const messages = await searchByRecipient(address);
    if (messages.length > 0) {
      // Mailpit returns newest first.
      return getMessage(messages[0]!.ID);
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `[mailpit] timed out after ${timeoutMs}ms waiting for mail to ${address}`,
      );
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
