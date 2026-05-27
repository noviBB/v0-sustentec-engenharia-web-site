// no `import 'server-only'` — tsx script runs outside the Next runtime.
// The `server-only` imports inside @/lib/notion are stubbed via a `paths`
// mapping in scripts/tsconfig.json (see the `notion:sync` script).

// Central config service — `lib/config.ts` has no `import 'server-only'`, so
// it's safe to import from a tsx script.
import { config } from '../lib/config';
import { syncClient, exportClient } from '../lib/notion';

/**
 * Notion sync CLI.
 *
 *   pnpm notion:sync --client=<clientId> [--direction=import|export]
 *
 * - import (default): Notion -> DB (wraps `syncClient`).
 * - export:           DB -> Notion (wraps `exportClient`, the reverse mapping).
 *
 * The Notion integration token is read via the central config service. If it
 * is empty/unset the CLI prints a clear error and exits non-zero — it never
 * attempts a live call without a real token.
 */

type Direction = 'import' | 'export';

interface Args {
  clientId: string;
  direction: Direction;
}

function parseArgs(argv: string[]): Args {
  let clientId: string | undefined;
  let direction: Direction = 'import';

  for (const arg of argv) {
    const clientMatch = /^--client=(.+)$/.exec(arg);
    if (clientMatch) {
      clientId = clientMatch[1];
      continue;
    }
    const dirMatch = /^--direction=(.+)$/.exec(arg);
    if (dirMatch) {
      const value = dirMatch[1];
      if (value !== 'import' && value !== 'export') {
        fail(`invalid --direction="${value}" (expected import|export)`);
      }
      direction = value;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  if (!clientId) {
    fail('missing required --client=<clientId>');
  }

  return { clientId: clientId as string, direction };
}

function printUsage(): void {
  console.log(
    'Usage: pnpm notion:sync --client=<clientId> [--direction=import|export]',
  );
}

function fail(message: string): never {
  console.error(`[notion:sync] ${message}`);
  printUsage();
  process.exit(1);
}

/**
 * Substrings that mark a non-real (example / scaffold) token. The .env.local
 * scaffold ships `secret_PLACEHOLDER_swap_for_real_notion_token`.
 */
const PLACEHOLDER_MARKERS = [
  'placeholder',
  'swap_for_real',
  'changeme',
  'your-notion',
  'your_notion',
  'example',
];

function isPlaceholderToken(token: string): boolean {
  if (token.length === 0) return true;
  const lower = token.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lower.includes(marker));
}

function assertRealToken(): void {
  const token = (config.server.NOTION_INTEGRATION_TOKEN ?? '').trim();
  if (isPlaceholderToken(token)) {
    fail(
      'NOTION_INTEGRATION_TOKEN is empty or a placeholder. Set a real ' +
        'integration token in the environment to run a live sync.',
    );
  }
}

async function main(): Promise<void> {
  const { clientId, direction } = parseArgs(process.argv.slice(2));
  assertRealToken();

  console.log(
    `[notion:sync] direction=${direction} client=${clientId} — starting`,
  );

  if (direction === 'import') {
    const result = await syncClient(clientId);
    console.log('[notion:sync] import done:', JSON.stringify(result, null, 2));
  } else {
    const result = await exportClient(clientId);
    console.log('[notion:sync] export done:', JSON.stringify(result, null, 2));
  }
}

main()
  .catch((err: unknown) => {
    console.error('[notion:sync] failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    // The Drizzle postgres pool keeps the event loop alive; exit explicitly.
    process.exit(process.exitCode ?? 0);
  });
