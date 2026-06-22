import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for end-to-end flow specs.
 *
 * - Flow specs live in `e2e/flows/`; supporting helpers/fixtures live in
 *   `e2e/` (and are not matched as tests).
 * - A `setup` project runs `e2e/auth.setup.ts` first to produce signed-in
 *   storage states under `e2e/storage/`. The `chromium` project depends on it
 *   and reuses the Engeprat session via `storageState`.
 * - `webServer` builds and serves the production app; locally it reuses an
 *   already-running server.
 */
const BASE_URL = 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './e2e/flows',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'setup',
      testDir: './e2e',
      testMatch: /.*\.setup\.ts$/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Default authenticated role for flow specs. Specs that need a
        // different role can override `storageState` per-test.
        storageState: 'e2e/storage/engeprat.json',
      },
      // Playwright's project-dependency key is `dependencies` (the `setup`
      // project runs first to produce the storage state used above).
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
