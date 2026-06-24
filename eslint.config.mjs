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
  // Block A — no runtime DB / Supabase server clients in components and
  // pages/layouts. The data layer lives behind controllers; view code should
  // only import row TYPES (allowTypeImports keeps `import type` legal) and use
  // the auth port instead of a Supabase server client. WARN for now — the
  // Integrator flips these to error once callers have migrated.
  {
    files: [
      'components/**/*.{ts,tsx}',
      'modules/**/components/**/*.{ts,tsx}',
      'app/**/page.tsx',
      'app/**/layout.tsx',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/lib/db', '@/lib/db/*', 'drizzle-orm', 'drizzle-orm/*', 'postgres'],
              allowTypeImports: true,
              message:
                'Do not access the database from view code. Import row TYPES from ' +
                '`@/modules/<domain>` and do data access in a controller.',
            },
            {
              group: ['@/lib/supabase/server', '@/lib/supabase/middleware'],
              allowTypeImports: true,
              message:
                'Do not create a Supabase server client in view code. Use the auth ' +
                'port instead.',
            },
          ],
        },
      ],
    },
  },
  // Block B — the deprecated `db` singleton stays dead. It was removed from
  // `@/lib/db`; importing the `db` name must not come back. WARN for now.
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['lib/db/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/db',
              importNames: ['db'],
              message:
                'The deprecated `db` singleton was removed. Use ' +
                'getDbService()/dbRls()/dbAnon().',
            },
          ],
        },
      ],
    },
  },
  // Block C — services stay framework-free. A `*.service.ts` must not reach for
  // Next.js request primitives or a Supabase client; those belong in the
  // controller/adapter layer. WARN for now.
  {
    files: ['modules/**/*.service.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'next/headers',
              message:
                'Services must be framework-free. Read request context in a ' +
                'controller and pass it in.',
            },
            {
              name: 'next/navigation',
              message:
                'Services must be framework-free. Handle navigation in a ' +
                'controller/route, not the service.',
            },
          ],
          patterns: [
            {
              group: ['@/lib/supabase/*'],
              message:
                'Services must be framework-free. Inject the data/auth port ' +
                'instead of importing a Supabase client.',
            },
          ],
        },
      ],
    },
  },
  // Block D — components reach the backend ONLY through a module hook
  // (`@/modules/<d>` `use*` hook), never a controller/service/repo directly.
  // Type-only imports stay legal (`allowTypeImports`) so views can keep
  // importing row/result TYPES from those files.
  {
    files: [
      'components/**/*.{ts,tsx}',
      'modules/**/components/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Controllers (server actions) and repos are the backend
              // entrypoints — components must go through a `use*` hook instead.
              // `.service` is intentionally NOT listed: server services carry
              // their own `import 'server-only'` guard (a client import fails
              // the build), while pure client-safe derivation services
              // (payments/processes) are meant to be imported by components.
              group: ['@/modules/*/*.controller', '@/modules/*/*.repo'],
              allowTypeImports: true,
              message:
                'Components reach the backend only through a module hook ' +
                '(`@/modules/<d>` use* hook), never a controller or repo directly.',
            },
          ],
        },
      ],
    },
  },
  // Block E — module barrels export repo TYPES only. A `modules/*/index.ts`
  // must not re-export repo VALUES (runtime data access stays server-side and
  // is imported directly from `@/modules/<d>/<d>.repo` by server callers).
  {
    files: ['modules/*/index.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['*.repo', './*.repo'],
              allowTypeImports: true,
              message:
                'Barrels export repo TYPES only; runtime data access stays ' +
                'server-side.',
            },
          ],
        },
      ],
    },
  },
  // Closed sets of values (result codes, event names, statuses) MUST be real
  // string `enum`s — never an `as const` object literal masquerading as one.
  // See docs/conventions.md. This guard flags `... as const` in the modules
  // that own those sets so the rule stays enforceable.
  {
    files: ['lib/constants/**', 'modules/**/*.schema.ts', 'modules/**/*.controller.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "TSAsExpression > TSTypeReference > Identifier[name='const']",
          message:
            'Do not use `as const` here. Closed sets of values (result codes, ' +
            'event names, statuses) MUST be a string `enum` (see lib/constants/ ' +
            'and docs/conventions.md).',
        },
      ],
    },
  },
);
