import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import * as relations from './relations';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');

const sql = postgres(url, { prepare: false, max: 10 });
export const db = drizzle(sql, { schema: { ...schema, ...relations } });
export { schema };
export * from './views';
