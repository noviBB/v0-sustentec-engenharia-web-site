import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Minimal flat ESLint config.
 *
 * Scope is deliberately narrow: the legacy v0-generated codebase has never
 * been linted, so a full ruleset would explode with pre-existing noise. The
 * one rule that matters here is the Notion adapter boundary —
 * `no-restricted-imports` forbidding `@notionhq/client` and the adapter's
 * internal modules anywhere outside `lib/notion/**`. The public surface
 * (`@/lib/notion`) stays importable everywhere.
 */

const FORBIDDEN_INTERNAL = [
  '@notionhq/client',
  '@/lib/notion/client',
  '@/lib/notion/property-map',
  '@/lib/notion/parsers',
  '@/lib/notion/repository',
  '@/lib/notion/bucketing',
  '@/lib/notion/types',
  '@/lib/notion/export',
];

const boundaryMessage =
  'Import the Notion adapter only via "@/lib/notion" (its public surface). ' +
  'Internal modules and @notionhq/client are restricted to lib/notion/**.';

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'components/ui/**',
      'lib/db/migrations/**',
      'drizzle/**',
    ],
  },
  // Base recommended for TS — but only surface the boundary rule project-wide
  // to avoid drowning in pre-existing legacy issues. We register js/tseslint
  // recommended only for the adapter itself (new, clean code).
  {
    files: ['lib/notion/**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      parserOptions: { projectService: false },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  // The boundary rule applies to the WHOLE repo except lib/notion itself.
  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    ignores: ['lib/notion/**'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: FORBIDDEN_INTERNAL.map((name) => ({
            name,
            message: boundaryMessage,
          })),
          patterns: [
            {
              group: ['@/lib/notion/*', '!@/lib/notion'],
              message: boundaryMessage,
            },
          ],
        },
      ],
    },
  },
);
