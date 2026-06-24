import { test, expect } from '../fixtures';

/**
 * Mark message read (messages SPEC §"Component (e2e)"): click an unread inbound
 * message → the unread badge decrements and the row flips to read.
 *
 * Authenticated as the seeded Engeprat client. Requires the seed to include at
 * least one unread inbound message for this client.
 */
test.use({ storageState: 'e2e/storage/engeprat.json' });

test.describe('message read', () => {
  test('clicking an unread message decrements the unread badge', async ({
    page,
    resetDb,
  }) => {
    // Reseed so the seeded unread inbound message is restored each run (this
    // test consumes it by marking it read).
    await resetDb(['public.messages']);

    await page.goto('/portal');

    // Open the inbox via the sidebar (i18n label "Mensagens").
    await page
      .getByRole('button', { name: /mensagens|messages|inbox/i })
      .first()
      .click();

    // Unread inbound cards carry data-testid="message-unread". Clicking one
    // marks it read (optimistic), which removes the testid — so the count of
    // unread cards drops by one.
    const unread = page.getByTestId('message-unread');
    await unread.first().waitFor({ timeout: 10_000 });
    const before = await unread.count();
    expect(before).toBeGreaterThan(0);

    await unread.first().click();

    await expect(async () => {
      expect(await page.getByTestId('message-unread').count()).toBe(before - 1);
    }).toPass({ timeout: 10_000 });
  });
});
