import { test, expect } from '../fixtures';

/**
 * Public contact form (marketing SPEC §"E2E (contact submit)"):
 *   - happy path: fill + submit → success toast + form reset;
 *   - rapid second submit → RateLimited toast — BUT the limiter degrades to
 *     allow-all unless UPSTASH_* creds are configured, so that assertion is
 *     gated behind an env check.
 *
 * Unauthenticated flow; clear inherited storage state.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const RATE_LIMITER_ON = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

async function fillContactForm(
  page: import('@playwright/test').Page,
  email: string,
) {
  // Stable ids on the marketing contact form (#name/#email/#phone/#message).
  await page.locator('#name').fill('Cliente Teste');
  await page.locator('#email').fill(email);
  await page.locator('#phone').fill('(22) 99999-9999');
  await page
    .locator('#message')
    .fill('Gostaria de mais informações sobre licenciamento ambiental.');
}

test.describe('contact form', () => {
  test('happy path: submit shows success toast and resets the form', async ({
    page,
  }) => {
    await page.goto('/#contact');
    await fillContactForm(page, `e2e-${Date.now()}@example.com`);

    await page.getByRole('button', { name: /enviar mensagem|send message/i }).click();

    // Success toast title (PT: "Mensagem enviada" / EN: "Message sent").
    // TODO selector: toast has no testid — asserting on copy.
    await expect(
      page.getByText(/mensagem enviada|message sent/i),
    ).toBeVisible({ timeout: 10_000 });

    // Form is reset on success.
    await expect(page.locator('#name')).toHaveValue('');
    await expect(page.locator('#message')).toHaveValue('');
  });

  test('rapid second submit is rate-limited (only when Upstash is configured)', async ({
    page,
  }) => {
    test.skip(
      !RATE_LIMITER_ON,
      'Rate limiter is parked unless UPSTASH_* env is set (limiter = allow-all).',
    );

    const email = `e2e-rl-${Date.now()}@example.com`;
    await page.goto('/#contact');

    // First submit (consumes the window).
    await fillContactForm(page, email);
    await page.getByRole('button', { name: /enviar mensagem|send message/i }).click();
    await expect(
      page.getByText(/mensagem enviada|message sent/i),
    ).toBeVisible({ timeout: 10_000 });

    // Immediate second submit with the same email/IP → RateLimited toast.
    await fillContactForm(page, email);
    await page.getByRole('button', { name: /enviar mensagem|send message/i }).click();
    // contact.error.rateLimited copy.
    await expect(
      page.getByText(/muitas tentativas|too many|aguarde|try again/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});
