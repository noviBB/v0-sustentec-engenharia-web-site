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

const MAILPIT_BASE_URL =
  process.env.MAILPIT_URL ?? process.env.INBUCKET_URL ?? 'http://127.0.0.1:54324';

/** Raw message summary from `GET /api/v1/search` (Mailpit shape). */
interface MailpitSummary {
  ID: string;
  Subject: string;
  To: Array<{ Address: string; Name: string }>;
  From: { Address: string; Name: string };
  Created: string;
}

/** Full message from `GET /api/v1/message/<ID>` (Mailpit shape). */
interface MailpitMessage {
  ID: string;
  Subject: string;
  To: Array<{ Address: string; Name: string }>;
  From: { Address: string; Name: string };
  Text: string;
  HTML: string;
}

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
  const data = (await res.json()) as { messages?: MailpitSummary[] };
  return data.messages ?? [];
}

/** Fetch a single message's full contents by id. */
async function getMessage(id: string): Promise<MailMessage> {
  const url = `${MAILPIT_BASE_URL}/api/v1/message/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[mailpit] GET ${url} failed: ${res.status}`);
  }
  const m = (await res.json()) as MailpitMessage;
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
 * Delete every captured message (test isolation). Mailpit clears the whole
 * store; the address argument is kept for call-site compatibility but the
 * suite only sends to the single notify address.
 */
export async function clearMailbox(_address?: string): Promise<void> {
  const url = `${MAILPIT_BASE_URL}/api/v1/messages`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok) {
    throw new Error(`[mailpit] DELETE ${url} failed: ${res.status}`);
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
