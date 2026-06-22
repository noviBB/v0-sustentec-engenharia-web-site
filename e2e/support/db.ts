/**
 * Database helpers for e2e specs.
 *
 * These shell out to the local Postgres (`psql`) for fast, targeted resets and
 * reuse the existing `pnpm db:seed` script for a full reseed. No test bodies
 * live here — only named, awaitable helpers the fixtures/specs compose.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

function databaseUrl(): string {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

/**
 * Run an arbitrary SQL statement against the test database via `psql`.
 * Throws if `psql` exits non-zero (stderr is surfaced in the error).
 */
export async function runSql(sql: string): Promise<void> {
  await execFileAsync('psql', [databaseUrl(), '-v', 'ON_ERROR_STOP=1', '-c', sql]);
}

/**
 * Truncate the given tables (RESTART IDENTITY CASCADE) in a single statement.
 * Table names must be trusted/static (test-controlled) — they are interpolated
 * directly into the SQL.
 *
 * @example await truncateTables(['public.pendencias', 'public.appointments'])
 */
export async function truncateTables(tables: readonly string[]): Promise<void> {
  if (tables.length === 0) return;
  const list = tables.join(', ');
  await runSql(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}

/**
 * Full reseed using the project's canonical seed script. Slower than
 * `truncateTables`; use between suites rather than between individual specs.
 */
export async function reseed(): Promise<void> {
  await execFileAsync('pnpm', ['db:seed'], {
    env: { ...process.env, DATABASE_URL: databaseUrl() },
  });
}

/**
 * Convenience: truncate the given tables, then run a full reseed so dependent
 * fixtures are restored to a known baseline.
 */
export async function resetTables(tables: readonly string[]): Promise<void> {
  await truncateTables(tables);
  await reseed();
}
