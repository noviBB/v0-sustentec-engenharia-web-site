import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const tsconfigRootDir = dirname(fileURLToPath(import.meta.url));

/**
 * Flat ESLint config: type-aware rules repo-wide (enforced at error), the
 * `as`-assertion ban, the Notion adapter boundary, and the module/auth layer
 * boundaries. Non-shipped code (scripts/tests/e2e) is relaxed in the last block.
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
      // Build/config files are not part of the TS project — exclude them from
      // the type-aware program rather than feed them to the project service.
      'eslint.config.mjs',
      'next.config.mjs',
      'postcss.config.mjs',
    ],
  },
  // Type-aware linting, repo-wide, enforced at ERROR. lib/notion is held to the
  // same bar (its old no-explicit-any/projectService:false exemption was
  // removed). Non-shipped code (scripts/tests/e2e) is relaxed in a later block.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir,
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      // Ban `as <Type>` and `as unknown as <Type>` assertions, but ALLOW
      // `as const`. The selector matches any TSAsExpression that is NOT
      // `... as const` (i.e. its asserted type is not the `const` reference).
      'no-restricted-syntax': [
        'error',
        {
          selector: "TSAsExpression:not(:has(TSTypeReference > Identifier[name='const']))",
          message:
            'Avoid `as` type assertions. Use zod/parse, a type guard, satisfies, ' +
            'or generics. `as const` is allowed.',
        },
      ],
    },
  },
  // The Notion adapter boundary applies to the WHOLE repo except lib/notion
  // itself (which owns @notionhq/client and its internal modules).
  {
    files: ['**/*.{ts,tsx,mjs,js}'],
    ignores: ['lib/notion/**'],
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
  // the auth port instead of a Supabase server client.
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
  // `@/lib/db`; importing the `db` name must not come back.
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
  // controller/adapter layer.
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
    files: [
      'lib/constants/**',
      'modules/**/*.schema.ts',
      'modules/**/*.controller.ts',
      'modules/**/*.service.ts',
      'modules/**/*.repo.ts',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        // Keep the global `as`-assertion ban active in these files too...
        {
          selector: "TSAsExpression:not(:has(TSTypeReference > Identifier[name='const']))",
          message:
            'Avoid `as` type assertions. Use zod/parse, a type guard, satisfies, ' +
            'or generics. `as const` is allowed.',
        },
        // ...and additionally forbid `as const` here: closed sets of values
        // (result codes, event names, statuses) MUST be a string `enum`.
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
  // Non-shipped code — scripts, test files/fakes, e2e. These deal in untyped
  // `fetch().json()`, test doubles, and ad-hoc casts; holding them to the new
  // type-safety bar would drown the signal. Downgrade the new rules here.
  {
    files: [
      'scripts/**',
      '**/__tests__/**',
      'e2e/**',
      'modules/_test-support/**',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'no-restricted-syntax': 'off',
      'no-empty-pattern': 'off',
    },
  },
);
