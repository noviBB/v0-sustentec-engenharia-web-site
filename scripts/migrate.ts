// no `import 'server-only'` — tsx script runs outside the Next runtime
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

// Central config service — `lib/config.ts` has no `import 'server-only'`, so
// it's safe to import from a tsx script (outside the Next.js runtime).
import { config } from '../lib/config';

const directUrl: string | undefined = config.server.DATABASE_DIRECT_URL;
const pooledUrl: string = config.server.DATABASE_URL;

const connectionUrl: string = directUrl ?? pooledUrl;

// Pooled connections (PgBouncer in transaction/session mode) require prepare:false
const usingPooled: boolean = !directUrl;
const sql = postgres(connectionUrl, usingPooled ? { prepare: false, max: 1 } : { max: 1 });

async function applyCustomMigrations(): Promise<void> {
  const customDir: string = resolve(process.cwd(), 'drizzle/custom');
  if (!existsSync(customDir)) {
    console.log('[custom] no drizzle/custom directory — skipping');
    return;
  }

  await sql.unsafe(
    `CREATE TABLE IF NOT EXISTS public._custom_migrations (
      filename text primary key,
      applied_at timestamptz not null default now(),
      sha256 text not null
    );`,
  );

  const files: string[] = readdirSync(customDir)
    .filter((f: string): boolean => f.endsWith('.sql'))
    .sort();

  for (const filename of files) {
    const filePath: string = join(customDir, filename);
    const content: string = readFileSync(filePath, 'utf8');
    const sha: string = createHash('sha256').update(content).digest('hex');

    const existing = await sql<{ sha256: string }[]>`
      SELECT sha256 FROM public._custom_migrations WHERE filename = ${filename}
    `;

    const existingRow = existing[0];
    if (existingRow) {
      const recordedSha: string = existingRow.sha256;
      if (recordedSha === sha) {
        console.log(`[custom] skip   ${filename}`);
        continue;
      }
      throw new Error(
        `[custom] sha mismatch for ${filename}: ledger has ${recordedSha}, file is ${sha}. ` +
          `Custom migration contents must not change after they have been applied. ` +
          `Write a new forward-only file (e.g. ${filename.replace(/\.sql$/, '_fix.sql')}) instead.`,
      );
    }

    await sql.begin(async (tx) => {
      await tx.unsafe(content);
      await tx`
        INSERT INTO public._custom_migrations (filename, sha256) VALUES (${filename}, ${sha})
      `;
    });
    console.log(`[custom] applied ${filename}`);
  }
}

async function main(): Promise<void> {
  console.log(
    `[migrate] using ${directUrl ? 'DATABASE_DIRECT_URL' : 'DATABASE_URL (pooled, prepare:false)'}`,
  );

  const migrator = drizzle(sql);
  await migrate(migrator, { migrationsFolder: 'drizzle/migrations' });
  console.log('[drizzle] migrations applied');

  await applyCustomMigrations();
  console.log('[migrate] done');
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
    throw err;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
