/**
 * Playwright `setup` project: produce authenticated storageState files for the
 * seeded roles, consumed by the `chromium` project via `storageState`.
 *
 * This is setup infrastructure, NOT a flow test — the only assertion is that
 * sign-in succeeded (a non-empty user id was returned).
 *
 * Seeded credentials mirror `scripts/seed-auth.ts`. Override per-environment
 * via E2E_<ROLE>_EMAIL / E2E_<ROLE>_PASSWORD if those ever change.
 */
import { test as setup, expect } from '@playwright/test';
import { loginToStorageState, type Credentials } from './support/auth';

const ROLES: ReadonlyArray<{ name: string; creds: Credentials }> = [
  {
    name: 'engeprat',
    creds: {
      email: process.env.E2E_ENGEPRAT_EMAIL ?? 'cliente@exemplo.com',
      password: process.env.E2E_ENGEPRAT_PASSWORD ?? '123456',
    },
  },
  {
    name: 'victor',
    creds: {
      email: process.env.E2E_VICTOR_EMAIL ?? 'victorfr2026ok@gmail.com',
      password: process.env.E2E_VICTOR_PASSWORD ?? 'local-dev-victor',
    },
  },
];

for (const role of ROLES) {
  setup(`authenticate ${role.name}`, async () => {
    const storagePath = `e2e/storage/${role.name}.json`;
    const userId = await loginToStorageState(role.creds, storagePath);
    expect(userId, `expected a user id for ${role.name}`).toBeTruthy();
  });
}
