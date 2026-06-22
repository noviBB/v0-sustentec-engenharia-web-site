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

    // Capture the current unread badge count. The badge is rendered near the
    // Mensagens nav item / inbox header.
    // TODO selector: the unread badge has no testid — this reads the first
    // small numeric badge on the page. Refine once a stable hook exists.
    const badge = page.locator('text=/^\\d+$/').first();
    const before = Number((await badge.textContent())?.trim() ?? '0');
    expect(before).toBeGreaterThan(0);

    // Click the first unread inbound message card.
    // TODO selector: message cards are clickable <Card>s without roles/testids;
    // the unread ones are visually highlighted. Clicking the first card here.
    await page.locator('[class*="cursor-pointer"]').first().click();

    // Badge decrements by one (optimistic, then confirmed).
    await expect(async () => {
      const after = Number((await badge.textContent())?.trim() ?? '0');
      expect(after).toBe(before - 1);
    }).toPass({ timeout: 10_000 });
  });
});
