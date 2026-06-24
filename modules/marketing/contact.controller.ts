'use server';
import 'server-only';

import { headers } from 'next/headers';
import { createHash } from 'node:crypto';

import { ResultCode } from '@/lib/constants/result-codes';
import { ResultKind } from '@/lib/enums';
import { checkContactRateLimit } from '@/lib/rate-limit';

import { contactSubmissionSchema } from './contact.schema';
import type { ContactSubmissionResult } from './contact.schema';
import { submitContactSubmission } from './contact.service';

// The service insert runs under `dbAnon` (see contact.repo.ts). The marketing
// form is unauthenticated, so we want an anon-role INSERT against the
// `contact_submissions` RLS policy (INSERT permitted for everyone, SELECT only
// for staff).

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

function hashEmail(email: string): string {
  // Normalize (lowercase + trim) so casing/whitespace variants share a key.
  return createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
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
    xff.split(',')[0]?.trim() || hdrs.get('x-real-ip') || 'unknown';

  const ipHash = ip === 'unknown' ? null : hashIp(ip);
  const userAgent = hdrs.get('user-agent');

  const emailHash = hashEmail(data.email);
  const rateLimit = await checkContactRateLimit({ ipHash, emailHash });
  if (!rateLimit.ok) {
    return { ok: false, code: ResultCode.RateLimited };
  }

  const result = await submitContactSubmission(data, { ipHash, userAgent });
  if (result.kind === ResultKind.Ok) {
    return { ok: true };
  }
  return { ok: false, code: ResultCode.ServerError, ref: result.ref };
}
