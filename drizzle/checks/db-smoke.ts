// inline Drizzle handle — `lib/db/index.ts` is server-only and not importable from tsx scripts
import { sql as drizzleSql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// Central config service — `lib/config.ts` has no `import 'server-only'`, so
// it's safe to import from a tsx script (outside the Next.js runtime).
import { config } from '../../lib/config';
import * as schema from '../../lib/db/schema';

const sql = postgres(config.server.DATABASE_URL, { prepare: false, max: 1 });
const db = drizzle(sql, { schema });

async function main(): Promise<void> {
  const clientRows = await db
    .select({
      id: schema.clients.id,
      name: schema.clients.name,
      notion_cnpj_filter: schema.clients.notion_cnpj_filter,
    })
    .from(schema.clients);

  if (clientRows.length !== 2) {
    throw new Error(`[db-smoke] expected 2 clients, got ${clientRows.length}`);
  }

  const cnpjFilters: Array<string | null> = clientRows
    .map((r): string | null => r.notion_cnpj_filter)
    .sort((a: string | null, b: string | null): number => {
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return a.localeCompare(b);
    });
  const expected: Array<string | null> = ['03314057000153', null];
  if (cnpjFilters[0] !== expected[0] || cnpjFilters[1] !== expected[1]) {
    throw new Error(
      `[db-smoke] unexpected notion_cnpj_filter set: ${JSON.stringify(cnpjFilters)}`,
    );
  }

  const techRows = await db
    .select({
      slug: schema.responsibleTechs.slug,
      display_name: schema.responsibleTechs.display_name,
    })
    .from(schema.responsibleTechs);

  if (techRows.length < 1) {
    throw new Error(`[db-smoke] expected >= 1 responsible_techs row, got ${techRows.length}`);
  }
  const hasIvon: boolean = techRows.some(
    (r): boolean => r.display_name === 'Dra. Ivón Oristela Benítez González',
  );
  if (!hasIvon) {
    throw new Error(
      `[db-smoke] expected responsible_techs to include "Dra. Ivón Oristela Benítez González"`,
    );
  }

  await db.execute(drizzleSql`SELECT 1 FROM public.v_processes_with_progress LIMIT 1`);

  console.log('[db-smoke] ok');
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
