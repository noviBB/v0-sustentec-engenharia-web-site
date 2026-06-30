import { test, expect } from '../fixtures';

/**
 * Portal UI login (messages SPEC / portal flow): drive the real login form
 * rather than reusing a storageState. This spec is UNAUTHENTICATED, so it
 * clears any storage state inherited from the chromium project default.
 */
test.use({ storageState: { cookies: [], origins: [] } });

const EMAIL = process.env.E2E_ENGEPRAT_EMAIL ?? 'cliente@exemplo.com';
const PASSWORD = process.env.E2E_ENGEPRAT_PASSWORD ?? '123456';

test.describe('portal login (UI)', () => {
  test('valid credentials land on the portal dashboard', async ({ page }) => {
    await page.goto('/portal/login');

    // Stable selectors: the login form inputs carry fixed ids (#email/#password).
    await page.locator('#email').fill(EMAIL);
    await page.locator('#password').fill(PASSWORD);
    // Submit button is the only submit in the form.
    await page.getByRole('button', { name: /entrar|sign in/i }).click();

    // On success the app navigates away from /portal/login into the protected
    // portal. Assert we left the login route.
    await expect(page).not.toHaveURL(/\/portal\/login/, { timeout: 15_000 });
    await expect(page).toHaveURL(/\/portal/);
  });

  // #41.1: the login page shows the "Sustentec Tracker" branding (tagline +
  // subtitle) and no longer carries the old "Portal do Cliente" phrasing.
  test('shows Sustentec Tracker branding (#41.1)', async ({ page }) => {
    await page.goto('/portal/login');

    // PT is the default/fallback language; EN alternates are accepted in case
    // the language switcher resolved to English.
    await expect(page.getByText(/sustentec tracker/i)).toBeVisible();
    await expect(
      page.getByText(
        /acompanhe seu processo ambiental em tempo real|track your environmental process in real time/i,
      ),
    ).toBeVisible();

    // The old "Portal do Cliente" phrasing must be gone.
    await expect(page.getByText(/portal do cliente/i)).toHaveCount(0);
  });

  test('invalid credentials show an error and stay on login', async ({ page }) => {
    await page.goto('/portal/login');
    await page.locator('#email').fill('nobody@example.com');
    await page.locator('#password').fill('wrong-password');
    await page.getByRole('button', { name: /entrar|sign in/i }).click();

    // The error banner carries data-testid="login-error" (PT copy is
    // "E-mail ou senha incorretos."). Assert the banner shows and we stay put.
    await expect(page.getByTestId('login-error')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page).toHaveURL(/\/portal\/login/);
  });
});
