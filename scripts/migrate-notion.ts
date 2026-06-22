// no `import 'server-only'` — tsx script runs outside the Next runtime.
// The `server-only` imports inside @/lib/notion are stubbed via a `paths`
// mapping in scripts/tsconfig.json.

import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { config } from '../lib/config';
import { AuditAction } from '../lib/constants/audit-events';
import { getDbService } from '../lib/db';
import { insertAuditLog } from '../lib/db/auditLog';
import { clients, processes } from '../lib/db/schema';
import { syncClient } from '../lib/notion';

const db = getDbService();

/**
 * Initial Notion -> DB migration CLI (issue #12).
 *
 *   pnpm db:notion:migrate [--dry-run] [--client=<cnpj>] [--verbose]
 *
 * - --dry-run: rolls back ALL DB writes per client via a transaction wrapper.
 *   `syncClient` does not expose a `dryRun` flag, so we wrap its call in a
 *   monkey-patched `db.transaction` that always aborts at the end. The Notion
 *   API is still hit (we want to see what *would* import).
 * - --client=<cnpj>: scope to one client matching clients.notion_cnpj_filter.
 * - --verbose: per-page log lines.
 *
 * Exit non-zero only on unrecoverable errors (Notion auth missing, DB
 * connection failure). Per-page mapping errors land in
 * processes.notion_sync_errors and the summary — the run still exits 0.
 */

interface Args {
  dryRun: boolean;
  client?: string;
  verbose: boolean;
}

function parseArgs(argv: string[]): Args {
  let dryRun = false;
  let client: string | undefined;
  let verbose = false;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--verbose') {
      verbose = true;
      continue;
    }
    const clientMatch = /^--client(?:=|\s+)(.+)$/.exec(arg);
    if (clientMatch) {
      client = clientMatch[1];
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }

  return { dryRun, client, verbose };
}

function printUsage(): void {
  console.log(
    'Usage: pnpm db:notion:migrate [--dry-run] [--client=<cnpj>] [--verbose]',
  );
}

function fail(message: string): never {
  console.error(`[notion:migrate] ${message}`);
  process.exit(1);
}

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
        'integration token in the environment to run an initial migration.',
    );
  }
}

function redactCnpj(cnpj: string | null): string | null {
  if (cnpj == null) return null;
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length < 8) return cnpj;
  return `${digits.slice(0, 2)}.***.${digits.slice(-6)}`;
}

interface ClientSummary {
  clientId: string;
  cnpjRedacted: string | null;
  pages_seen: number;
  pages_imported: number;
  pages_skipped: number;
  pages_errored: number;
  pages_soft_deleted: number;
  tasks_imported: number;
  duration_ms: number;
  error?: string;
}

/**
 * Wraps a thunk in a transaction that ALWAYS rolls back, by routing all
 * `db.transaction` calls through one outer aborting transaction. This is the
 * --dry-run path: Notion is still queried but no DB state survives.
 *
 * Implementation detail: we monkey-patch `db.transaction` for the duration of
 * the call so the nested transactions inside `importFromNotion` join the
 * outer one and roll back together when we throw at the end.
 *
 * Hardening:
 *   1. The pre-patch `db.transaction` value is captured BEFORE entering the
 *      try/finally so a throw during capture can't leave a dangling patch.
 *   2. A sentinel symbol marks the patched function so a second concurrent
 *      call refuses to re-patch (would otherwise capture the patched
 *      function as "original" and never restore the real one).
 *   3. The `finally` only restores when the live `db.transaction` is still
 *      our patch — otherwise we'd clobber whatever the other caller set.
 *   4. The previous version captured `original` using `db.transaction.bind`,
 *      which produces a NEW function each call. That made the
 *      `db.transaction === patched` invariant check below impossible to
 *      satisfy after restoration. We now snapshot the property directly.
 */
const DRY_RUN_PATCH_MARKER = Symbol.for('migrate-notion-dry-run-patch');
type DbTx = typeof db.transaction;
type PatchedDbTx = DbTx & { [DRY_RUN_PATCH_MARKER]?: true };

async function runWithRollback<T>(thunk: () => Promise<T>): Promise<T> {
  // Snapshot BEFORE the try. If this property access throws (it shouldn't,
  // but belt-and-braces), no patch was ever installed and there's nothing
  // to restore.
  const original = db.transaction as PatchedDbTx;
  if (original[DRY_RUN_PATCH_MARKER]) {
    throw new Error(
      'runWithRollback: db.transaction is already patched (concurrent dry-run?). Refusing to re-patch.',
    );
  }

  // Sentinel error: thrown to abort the outer transaction at the end.
  const ROLLBACK = Symbol('dry-run-rollback');

  // We'll bind the patched function to a stable identity so the finally
  // block can assert "the patch I installed is still the live value" before
  // restoring. Declared up-front so it's in scope for the `finally`.
  const patchHolder: { current: PatchedDbTx | null } = { current: null };
  try {
    const result = await original.call(db, async (outerTx) => {
      // While the dry-run is active, every inner `db.transaction(fn)` reuses
      // the outer transaction so a single rollback at the end cancels everything.
      const patched = ((fn: (tx: typeof outerTx) => unknown) =>
        Promise.resolve(fn(outerTx))) as PatchedDbTx;
      patched[DRY_RUN_PATCH_MARKER] = true;
      patchHolder.current = patched;
      (db as { transaction: DbTx }).transaction = patched;
      const r = await thunk();
      throw { __rollback: ROLLBACK, value: r };
    });
    return result as T;
  } catch (e: unknown) {
    if (e && typeof e === 'object' && '__rollback' in e) {
      return (e as unknown as { value: T }).value;
    }
    throw e;
  } finally {
    // Only restore if `db.transaction` is still our patch. If something
    // else swapped it (shouldn't happen single-threaded, but the assertion
    // catches concurrent misuse), leave that other value in place.
    const live = db.transaction as PatchedDbTx;
    if (patchHolder.current && live === patchHolder.current) {
      (db as { transaction: DbTx }).transaction = original;
    }
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  assertRealToken();

  const baseWhere = and(
    isNull(clients.deleted_at),
    isNotNull(clients.notion_cnpj_filter),
  );
  const where = args.client
    ? and(baseWhere, eq(clients.notion_cnpj_filter, args.client))
    : baseWhere;

  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      notion_cnpj_filter: clients.notion_cnpj_filter,
    })
    .from(clients)
    .where(where);

  if (rows.length === 0) {
    console.log(
      `[notion:migrate] no clients matched (filter=${args.client ?? 'none'}).`,
    );
    return;
  }

  console.log(
    `[notion:migrate] starting${args.dryRun ? ' (DRY-RUN)' : ''} — ${rows.length} client(s)`,
  );

  const summaries: ClientSummary[] = [];
  const startRun = Date.now();
  const unmappedAliases = new Set<string>();
  const erroredPages: { clientId: string; processId: string; errors: unknown }[] = [];

  for (const row of rows) {
    const cnpjRedacted = redactCnpj(row.notion_cnpj_filter);
    const startClient = Date.now();
    let summary: ClientSummary;

    try {
      const runOne = async () => syncClient(row.id);
      const result = args.dryRun ? await runWithRollback(runOne) : await runOne();

      // Pull per-page mapping errors (only meaningful on a real run; on a
      // dry-run the rollback wipes them, so we read pre-existing state).
      const errorRows = await db
        .select({
          id: processes.id,
          notion_sync_errors: processes.notion_sync_errors,
        })
        .from(processes)
        .where(
          and(eq(processes.client_id, row.id), isNull(processes.deleted_at)),
        );

      for (const er of errorRows) {
        if (!er.notion_sync_errors) continue;
        const errs = er.notion_sync_errors as Array<{
          field?: string;
          value?: unknown;
        }>;
        if (!Array.isArray(errs) || errs.length === 0) continue;
        erroredPages.push({
          clientId: row.id,
          processId: er.id,
          errors: errs,
        });
        for (const er2 of errs) {
          if (
            er2.field === 'responsible_tech_id' &&
            typeof er2.value === 'string'
          ) {
            unmappedAliases.add(er2.value);
          }
        }
      }

      // process-level task count: count rows in processes (the adapter doesn't
      // surface tasks_imported directly; we count tasks linked to imported
      // processes for the summary).
      summary = {
        clientId: row.id,
        cnpjRedacted,
        pages_seen: result.pages_total,
        pages_imported: result.pages_created + result.pages_updated,
        pages_skipped: result.pages_skipped,
        pages_errored: result.pages_failed,
        pages_soft_deleted: result.pages_soft_deleted,
        // tasks_imported: not surfaced by the adapter; reported as 0 here.
        // (Per-process task counts can be reconstructed from process_tasks if
        // needed; the adapter doesn't aggregate them today.)
        tasks_imported: 0,
        duration_ms: Date.now() - startClient,
      };

      if (args.verbose) {
        console.log(
          `[notion:migrate] client=${row.id} cnpj=${cnpjRedacted} ` +
            `seen=${summary.pages_seen} imported=${summary.pages_imported} ` +
            `skipped=${summary.pages_skipped} errored=${summary.pages_errored} ` +
            `soft_deleted=${summary.pages_soft_deleted} ` +
            `duration_ms=${summary.duration_ms}`,
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(
        `[notion:migrate] client=${row.id} cnpj=${cnpjRedacted} FAILED: ${message}`,
      );
      summary = {
        clientId: row.id,
        cnpjRedacted,
        pages_seen: 0,
        pages_imported: 0,
        pages_skipped: 0,
        pages_errored: 0,
        pages_soft_deleted: 0,
        tasks_imported: 0,
        duration_ms: Date.now() - startClient,
        error: message,
      };
    }

    if (!args.dryRun) {
      // Audit row records the run regardless of success — operators can
      // grep by action. Skip on dry-run since we don't want phantom rows.
      try {
        await insertAuditLog({
          action: AuditAction.NotionInitialMigration,
          entity_type: 'client',
          entity_id: row.id,
          after: {
            trigger: 'initial_migration',
            pages_seen: summary.pages_seen,
            pages_imported: summary.pages_imported,
            pages_skipped: summary.pages_skipped,
            pages_errored: summary.pages_errored,
            tasks_imported: summary.tasks_imported,
            duration_ms: summary.duration_ms,
            cnpj_filter_redacted: cnpjRedacted,
            ...(summary.error ? { error: summary.error } : {}),
          },
        });
      } catch (e) {
        console.error(
          `[notion:migrate] audit_log insert failed for client=${row.id}: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
      }
    }

    summaries.push(summary);
  }

  const totalDuration = Date.now() - startRun;

  // --- End-of-run summary ---
  console.log('\n=== notion:migrate summary ===');
  for (const s of summaries) {
    console.log(
      `  client=${s.clientId} cnpj=${s.cnpjRedacted} ` +
        `seen=${s.pages_seen} imported=${s.pages_imported} ` +
        `skipped=${s.pages_skipped} errored=${s.pages_errored} ` +
        `soft_deleted=${s.pages_soft_deleted} ` +
        `duration_ms=${s.duration_ms}` +
        (s.error ? ` error="${s.error}"` : ''),
    );
  }
  console.log(`Total clients: ${summaries.length}`);
  console.log(`Total duration: ${totalDuration}ms`);
  console.log(`Dry-run: ${args.dryRun ? 'YES (no DB writes survived)' : 'no'}`);

  if (unmappedAliases.size > 0) {
    console.error('\nUnmapped Responsável aliases (need responsible_tech_aliases rows):');
    for (const alias of unmappedAliases) {
      console.error(`  - ${alias}`);
    }
  }

  if (erroredPages.length > 0) {
    console.log(`\nPages with notion_sync_errors: ${erroredPages.length}`);
    for (const ep of erroredPages.slice(0, 20)) {
      console.log(
        `  client=${ep.clientId} process=${ep.processId} errors=${JSON.stringify(ep.errors)}`,
      );
    }
    if (erroredPages.length > 20) {
      console.log(`  ... and ${erroredPages.length - 20} more`);
    }
  }
}

main()
  .catch((err: unknown) => {
    console.error(
      '[notion:migrate] failed:',
      err instanceof Error ? err.message : err,
    );
    process.exitCode = 1;
  })
  .finally(() => {
    // Drizzle postgres pool keeps the event loop alive; exit explicitly.
    process.exit(process.exitCode ?? 0);
  });
