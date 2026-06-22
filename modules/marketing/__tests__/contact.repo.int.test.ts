import { afterAll, expect, it } from 'vitest';

import { describeIntegration } from '@/modules/_test-support/integration';

/**
 * RLS invariant (marketing SPEC §"Integration (anon RLS)"):
 *   - role `anon` MAY INSERT into contact_submissions (WITH CHECK true),
 *   - role `anon` may NOT SELECT — there is no anon read policy, so an anon
 *     SELECT returns zero rows even for rows that exist.
 *
 * All DB code is dynamically imported so this file never loads `@/lib/db`
 * (which throws on missing server env) when the suite is skipped.
 */
const createdIds: string[] = [];

afterAll(async () => {
  if (createdIds.length === 0) return;
  const { getDbService } = await import('@/lib/db');
  const { contactSubmissions } = await import('@/lib/db/schema');
  const { inArray } = await import('drizzle-orm');
  await getDbService()
    .delete(contactSubmissions)
    .where(inArray(contactSubmissions.id, createdIds));
});

describeIntegration('contact.repo (anon RLS)', () => {
  it('anon may INSERT a submission', async () => {
    const { insertContactSubmission } = await import(
      '@/modules/marketing/contact.repo'
    );
    const result = await insertContactSubmission({
      name: 'Anon Tester',
      email: `anon-${Date.now()}@example.com`,
      phone: null,
      message: 'integration insert',
      ip_hash: null,
      source: 'marketing_site',
      user_agent: null,
    });
    expect(result.id).toBeTruthy();
    createdIds.push(result.id as string);
  });

  it('anon may NOT SELECT submissions (deny-select invariant)', async () => {
    const { dbAnon, getDbService } = await import('@/lib/db');
    const { contactSubmissions } = await import('@/lib/db/schema');

    // Seed a row via the service connection so it definitely exists...
    const [seeded] = await getDbService()
      .insert(contactSubmissions)
      .values({
        name: 'Service Seeded',
        email: `seed-${Date.now()}@example.com`,
        message: 'should be invisible to anon',
        source: 'marketing_site',
      })
      .returning({ id: contactSubmissions.id });
    createdIds.push(seeded!.id);

    // ...then prove the anon role cannot read it back.
    const rows = await dbAnon((tx) => tx.select().from(contactSubmissions));
    expect(rows).toHaveLength(0);
  });
});
