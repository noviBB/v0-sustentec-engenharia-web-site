'use server';

import { headers } from 'next/headers';
import { createHash, randomUUID } from 'node:crypto';

import { AuditEvent } from '@/lib/constants/audit-events';
import { ResultCode } from '@/lib/constants/result-codes';
import { insertContactSubmission } from '@/lib/db/contactSubmissions';
import {
  contactSubmissionSchema,
  type ContactSubmissionResult,
} from '@/lib/schemas/contact';

// `insertContactSubmission` runs under `dbAnon` — see lib/db/contactSubmissions.ts.
// The marketing form is unauthenticated, so we want an anon-role INSERT
// against the `contact_submissions` RLS policy (which permits INSERT for
// everyone, SELECT only for staff).

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export async function submitContact(
  input: unknown,
): Promise<ContactSubmissionResult> {
  const parsed = contactSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: ResultCode.Validation };
  }

  const data = parsed.data;

  const hdrs = await headers();
  const xff = hdrs.get('x-forwarded-for') ?? '';
  const ip =
    xff.split(',')[0].trim() ||
    hdrs.get('x-real-ip') ||
    'unknown';

  const ipHash = ip === 'unknown' ? null : hashIp(ip);
  const userAgent = hdrs.get('user-agent');

  // TODO(#22, rate limiting): re-introduce rate limiting with Upstash

  try {
    await insertContactSubmission({
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      message: data.message,
      ip_hash: ipHash,
      source: 'marketing_site',
      user_agent: userAgent,
    });
    return { ok: true };
  } catch (err) {
    const ref = randomUUID().slice(0, 8);
    console.error(
      JSON.stringify({
        event: AuditEvent.ContactSubmitFailed,
        ref,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return { ok: false, code: ResultCode.ServerError, ref };
  }
}
