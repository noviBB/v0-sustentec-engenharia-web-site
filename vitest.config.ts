import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest config split into two projects:
 *
 * - `unit`        — fast, no external services. Runs the existing Notion
 *                   adapter tests plus any `modules/**` unit tests.
 * - `integration` — talks to the local Supabase stack (`supabase start`).
 *                   Files are `*.int.test.ts`, run serially, with a longer
 *                   timeout and a setup file that loads `.env.test`.
 *
 * Shared aliases (applied to both projects):
 * - `@/...`     mirrors tsconfig paths (repo root).
 * - `server-only` is stubbed: it throws when imported outside an RSC context,
 *   but several modules pull it in transitively via types. The stub lets us
 *   exercise pure logic under Node without a Next.js server runtime.
 */
const sharedAlias = {
  'server-only': resolve(__dirname, 'lib/notion/__tests__/server-only-stub.ts'),
  '@': resolve(__dirname, '.'),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: sharedAlias },
        test: {
          name: 'unit',
          environment: 'node',
          include: [
            'lib/**/__tests__/**/*.test.ts',
            'modules/**/__tests__/**/*.test.ts',
          ],
          // Integration specs share the `.test.ts` suffix but must never run
          // in the unit project — they require the live Supabase stack.
          exclude: ['**/*.int.test.ts'],
        },
      },
      {
        resolve: { alias: sharedAlias },
        test: {
          name: 'integration',
          environment: 'node',
          include: ['**/*.int.test.ts'],
          // Integration tests mutate shared DB state; serialize them.
          fileParallelism: false,
          testTimeout: 20000,
          setupFiles: ['test/setup.integration.ts'],
        },
      },
    ],
  },
});
