import 'server-only';

import { randomUUID } from 'node:crypto';

import { AuditEvent } from '@/lib/constants/audit-events';
import { ResultKind } from '@/lib/enums';

import { insertContactSubmission } from './contact.repo';
import type { ContactSubmissionInput } from './contact.schema';

/**
 * Domain result for a contact-form submission attempt.
 *
 * This is the marketing domain's own result shape — deliberately decoupled
 * from `ResultCode` (the server-action wire contract). The controller maps
 * `{ kind }` → `ResultCode` so transport concerns stay out of the service.
 */
export type ContactServiceResult =
  | { kind: ResultKind.Ok }
  | { kind: ResultKind.Error; ref: string };

/**
 * Request context the controller resolves (from `headers()`) and forwards to
 * the service. The service never reads `next/headers` itself — it receives
 * already-derived, already-hashed values.
 */
export type ContactSubmissionContext = {
  /** SHA-256 of the client IP, or `null` when the IP was unknown. */
  ipHash: string | null;
  /** Raw `user-agent` header value, or `null` when absent. */
  userAgent: string | null;
};

/**
 * Persist a validated contact submission via the anon-role repository and,
 * on failure, emit a structured audit log line carrying a short error `ref`.
 *
 * Pure orchestration: no `next/*`, no `'use server'`, no direct supabase. The
 * insert runs under `dbAnon` inside the repo (see `contact.repo.ts`).
 */
export async function submitContactSubmission(
  data: ContactSubmissionInput,
  ctx: ContactSubmissionContext,
): Promise<ContactServiceResult> {
  try {
    await insertContactSubmission({
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      message: data.message,
      ip_hash: ctx.ipHash,
      source: 'marketing_site',
      user_agent: ctx.userAgent,
    });
    return { kind: ResultKind.Ok };
  } catch (err) {
    const ref = randomUUID().slice(0, 8);
    console.error(
      JSON.stringify({
        event: AuditEvent.ContactSubmitFailed,
        ref,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return { kind: ResultKind.Error, ref };
  }
}
