/**
 * Shared Playwright fixtures for e2e flow specs.
 *
 * Import `test` and `expect` from this module instead of `@playwright/test`
 * to get the project's fixtures (e.g. per-spec DB reset).
 *
 * Usage in a spec:
 *
 *   import { test, expect } from '../fixtures';
 *
 *   test('does a thing', async ({ page, resetDb }) => {
 *     await resetDb(['public.pendencias']); // truncate + reseed before acting
 *     // ...
 *   });
 */
import { test as base, expect } from '@playwright/test';
import { resetTables } from './support/db';

type ResetDb = (tables: readonly string[]) => Promise<void>;

interface Fixtures {
  /**
   * Reset the given tables (truncate + reseed) on demand within a spec. Call
   * it explicitly so each spec declares the tables it depends on; the fixture
   * itself performs no work unless invoked.
   */
  resetDb: ResetDb;
}

export const test = base.extend<Fixtures>({
  resetDb: async ({}, use) => {
    const reset: ResetDb = async (tables) => {
      await resetTables(tables);
    };
    await use(reset);
  },
});

export { expect };
