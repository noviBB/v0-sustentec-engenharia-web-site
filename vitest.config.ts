import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Vitest config for the Notion adapter unit tests.
 *
 * - `@/...` alias mirrors tsconfig paths (repo root).
 * - `server-only` is stubbed: it throws when imported outside an RSC context,
 *   but the parser/property-map modules pull it in transitively via types.ts.
 *   The stub lets us unit-test pure logic without a Next.js server runtime.
 */
export default defineConfig({
  resolve: {
    alias: {
      'server-only': resolve(__dirname, 'lib/notion/__tests__/server-only-stub.ts'),
      '@': resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['lib/**/__tests__/**/*.test.ts'],
    environment: 'node',
  },
});
