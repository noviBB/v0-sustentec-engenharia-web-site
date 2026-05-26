'use server';

// TODO: switch to db('anon') once the factory exists — currently uses the elevated db instance and bypasses RLS.

import { headers } from 'next/headers';
import { createHash, randomUUID } from 'node:crypto';

import { insertContactSubmission } from '@/lib/db/contactSubmissions';
import {
  contactSubmissionSchema,
  type ContactSubmissionResult,
} from '@/lib/schemas/contact';

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
    xff.split(',')[0].trim() ||
    hdrs.get('x-real-ip') ||
    'unknown';

  const ipHash = ip === 'unknown' ? null : hashIp(ip);
  const userAgent = hdrs.get('user-agent');

  // TODO(#17): re-introduce rate limiting with Upstash — see issue 17

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
        event: 'contact_submit_failed',
        ref,
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return { ok: false, code: 'server_error', ref };
  }
}
