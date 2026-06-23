import { afterAll, expect, it } from 'vitest';

import { describeIntegration } from '@/modules/_test-support/integration';

/**
 * RLS invariant (marketing SPEC §"Integration (anon RLS)"):
 *   - role `anon` MAY INSERT into contact_submissions (INSERT grant + WITH
 *     CHECK true), but the insert is write-only — no RETURNING.
 *   - role `anon` may NOT SELECT: there is no SELECT grant for anon (only a
 *     staff SELECT policy), so an anon SELECT is denied at the privilege level
 *     (throws "permission denied"), not merely filtered to zero rows.
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
  it('anon may INSERT a submission (write-only)', async () => {
    const { insertContactSubmission } = await import(
      '@/modules/marketing/contact.repo'
    );
    const { getDbService } = await import('@/lib/db');
    const { contactSubmissions } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    const email = `anon-${Date.now()}@example.com`;
    // The anon insert must succeed (and return nothing — it's write-only).
    await expect(
      insertContactSubmission({
        name: 'Anon Tester',
        email,
        phone: null,
        message: 'integration insert',
        ip_hash: null,
        source: 'marketing_site',
        user_agent: null,
      }),
    ).resolves.toBeUndefined();

    // Verify the row landed — read via the SERVICE connection, since anon
    // itself has no read privilege.
    const rows = await getDbService()
      .select({ id: contactSubmissions.id })
      .from(contactSubmissions)
      .where(eq(contactSubmissions.email, email));
    expect(rows).toHaveLength(1);
    createdIds.push(rows[0]!.id);
  });

  it('anon may NOT SELECT submissions (no read privilege)', async () => {
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

    // ...then prove the anon role cannot read it back: anon has no SELECT
    // grant, so the read is rejected at the privilege level.
    await expect(
      dbAnon((tx) => tx.select().from(contactSubmissions)),
    ).rejects.toThrow(/permission denied/i);
  });
});
