/**
 * Inbucket helpers for e2e specs.
 *
 * The local Supabase stack runs Inbucket as its SMTP sink. Mail sent by the
 * app (EMAIL_PROVIDER=smtp -> SMTP_PORT=54325) is captured there and read back
 * over Inbucket's REST API on :54324. These helpers poll for delivery, since
 * mail arrives asynchronously after the triggering request returns.
 */

const INBUCKET_BASE_URL =
  process.env.INBUCKET_URL ?? 'http://127.0.0.1:54324';

/** Summary entry returned by `GET /api/v1/mailbox/<addr>`. */
export interface InbucketMessageSummary {
  id: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  size: number;
}

/** Full message returned by `GET /api/v1/mailbox/<addr>/<id>`. */
export interface InbucketMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  date: string;
  body: { text: string; html: string };
  header: Record<string, string[]>;
}

/** The mailbox name is the local-part of the address, lowercased. */
function mailboxName(address: string): string {
  return address.split('@')[0]!.toLowerCase();
}

/** List all messages currently in an address's mailbox (newest last). */
export async function listMessages(
  address: string,
): Promise<InbucketMessageSummary[]> {
  const url = `${INBUCKET_BASE_URL}/api/v1/mailbox/${encodeURIComponent(mailboxName(address))}`;
  const res = await fetch(url);
  if (res.status === 404) return [];
  if (!res.ok) {
    throw new Error(`[inbucket] GET ${url} failed: ${res.status}`);
  }
  return (await res.json()) as InbucketMessageSummary[];
}

/** Fetch a single message's full contents by id. */
export async function getMessage(
  address: string,
  id: string,
): Promise<InbucketMessage> {
  const url = `${INBUCKET_BASE_URL}/api/v1/mailbox/${encodeURIComponent(mailboxName(address))}/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`[inbucket] GET ${url} failed: ${res.status}`);
  }
  return (await res.json()) as InbucketMessage;
}

/** Delete every message in an address's mailbox (test isolation). */
export async function clearMailbox(address: string): Promise<void> {
  const url = `${INBUCKET_BASE_URL}/api/v1/mailbox/${encodeURIComponent(mailboxName(address))}`;
  const res = await fetch(url, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`[inbucket] DELETE ${url} failed: ${res.status}`);
  }
}

export interface WaitForOptions {
  /** Max time to wait, in ms. Default 15000. */
  timeoutMs?: number;
  /** Poll interval, in ms. Default 500. */
  intervalMs?: number;
}

/**
 * Poll an address's mailbox until at least one message is present, then return
 * the full contents of the latest message. Throws on timeout.
 */
export async function waitForLatestMessage(
  address: string,
  options: WaitForOptions = {},
): Promise<InbucketMessage> {
  const { timeoutMs = 15_000, intervalMs = 500 } = options;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const messages = await listMessages(address);
    if (messages.length > 0) {
      const latest = messages[messages.length - 1]!;
      return getMessage(address, latest.id);
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `[inbucket] timed out after ${timeoutMs}ms waiting for mail to ${address}`,
      );
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}
