/**
 * Integration-test setup: load `.env.test` into `process.env` before any
 * integration spec runs. No test logic lives here.
 *
 * Dependency-light loader (no `dotenv` install required):
 *   1. Prefer Node's native `process.loadEnvFile` (Node >= 20.12 / 22).
 *   2. Fall back to a tiny manual `KEY=VALUE` parser.
 *
 * `.env.test` is optional: in CI the variables are already injected into the
 * job environment, so a missing file is not an error.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(__dirname, '..', '.env.test');

function manualLoad(path: string): void {
  const contents = readFileSync(path, 'utf8');
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (key === '' || key in process.env) continue; // don't clobber real env
    let value = line.slice(eq + 1).trim();
    // Strip a single layer of matching surrounding quotes.
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

if (existsSync(envPath)) {
  const loadEnvFile = (
    process as unknown as { loadEnvFile?: (path: string) => void }
  ).loadEnvFile;
  if (typeof loadEnvFile === 'function') {
    loadEnvFile(envPath);
  } else {
    manualLoad(envPath);
  }
}
