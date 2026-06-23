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
  }) => {
    await page.goto('/portal');

    // Open the inbox via the sidebar.
    // TODO selector: sidebar item is an i18n label (portal.nav.messages —
    // PT "Mensagens"); no testid available.
    await page
      .getByRole('button', { name: /mensagens|messages|inbox/i })
      .first()
      .click();

    // The Mensagens sidebar item shows the unread count in a badge with
    // data-testid="nav-badge-mensagens".
    const badge = page.getByTestId('nav-badge-mensagens');
    const before = Number((await badge.textContent())?.trim() ?? '0');
    expect(before).toBeGreaterThan(0);

    // Click the first unread inbound message card (data-testid="message-unread").
    await page.getByTestId('message-unread').first().click();

    // Badge decrements by one (optimistic, then confirmed).
    await expect(async () => {
      const after = Number((await badge.textContent())?.trim() ?? '0');
      expect(after).toBe(before - 1);
    }).toPass({ timeout: 10_000 });
  });
});
