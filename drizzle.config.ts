import { defineConfig } from 'drizzle-kit';

// Central config service. `lib/config.ts` has NO `import 'server-only'`, so it
// is safe to import from the drizzle-kit CLI (outside the Next.js runtime).
import { config } from './lib/config';

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.server.DATABASE_DIRECT_URL ?? config.server.DATABASE_URL,
  },
  casing: 'snake_case',
  strict: true,
  verbose: true,
});
