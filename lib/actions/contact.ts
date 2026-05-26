'use server';

import { headers } from 'next/headers';
import { createHash } from 'node:crypto';

import { insertContactSubmission } from '@/lib/db/contactSubmissions';
import { checkAll } from '@/lib/rate-limit';
import {
  contactSubmissionSchema,
  type ContactSubmissionResult,
} from './contact-schema';

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex');
}

export async function submitContact(
  input: unknown,
): Promise<ContactSubmissionResult> {
  const parsed = contactSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, code: 'validation' };
  }

  const data = parsed.data;

  const hdrs = await headers();
  const xff = hdrs.get('x-forwarded-for') ?? '';
  const ip =
    (xff.split(',')[0] ?? '').trim() ||
    hdrs.get('x-real-ip') ||
    'unknown';

  const ipHash = ip === 'unknown' ? null : hashIp(ip);
  const emailKey = data.email.toLowerCase();

  // Rate-limit by IP and email together in a 5-minute window.
  const allowed = checkAll([`ip:${ip}`, `email:${emailKey}`]);
  if (!allowed) {
    return { ok: false, code: 'rate_limited' };
  }

  try {
    await insertContactSubmission({
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      message: data.message,
      ip_hash: ipHash,
    });
    return { ok: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[contact] insert failed', err);
    return { ok: false, code: 'server_error' };
  }
}
