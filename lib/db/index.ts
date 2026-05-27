import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { config } from '@/lib/config';
import * as schema from './schema';
import * as relations from './relations';

const sql = postgres(config.server.DATABASE_URL, { prepare: false, max: 10 });
export const db = drizzle(sql, { schema: { ...schema, ...relations } });
export { schema };
export * from './views';
