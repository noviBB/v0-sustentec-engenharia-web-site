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

  test('invalid credentials show an error and stay on login', async ({ page }) => {
    await page.goto('/portal/login');
    await page.locator('#email').fill('nobody@example.com');
    await page.locator('#password').fill('wrong-password');
    await page.getByRole('button', { name: /entrar|sign in/i }).click();

    // invalidCredentials message renders inline (PT: "Credenciais inválidas..."
    // EN: "Invalid credentials..."). Match loosely on the shared word.
    // TODO selector: no data-testid on the error banner — asserting on copy.
    await expect(
      page.getByText(/credenciais|invalid credentials/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/portal\/login/);
  });
});
