// inline Drizzle handle — `lib/db/index.ts` is server-only and not importable from tsx scripts
import { eq, sql as drizzleSql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../lib/db/schema';

interface AuthUser {
  id: string;
  email?: string;
}

interface AdminUsersListResponse {
  users: AuthUser[];
}

const SUPABASE_URL: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY: string | undefined = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL: string | undefined = process.env.DATABASE_URL;

if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}
if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const baseUrl: string = SUPABASE_URL;
const serviceKey: string = SERVICE_ROLE_KEY;

const adminHeaders: Record<string, string> = {
  Authorization: `Bearer ${serviceKey}`,
  apikey: serviceKey,
};

const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });
const db = drizzle(sql, { schema });

async function getAuthUserId(email: string): Promise<string> {
  const url: string = `${baseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
  const res: Response = await fetch(url, { headers: adminHeaders });
  if (!res.ok) {
    const body: string = await res.text();
    throw new Error(`[seed-data] GET ${url} failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as AdminUsersListResponse;
  if (!Array.isArray(data.users) || data.users.length === 0) {
    throw new Error(`[seed-data] no auth user found for ${email} — run \`pnpm seed:auth\` first`);
  }
  return data.users[0].id;
}

async function upsertClient(name: string, cnpjFilter: string | null): Promise<string> {
  const existing = await db
    .select({ id: schema.clients.id })
    .from(schema.clients)
    .where(eq(schema.clients.name, name))
    .limit(1);
  if (existing.length > 0) {
    return existing[0].id;
  }
  const inserted = await db
    .insert(schema.clients)
    .values({ name, notion_cnpj_filter: cnpjFilter })
    .returning({ id: schema.clients.id });
  return inserted[0].id;
}

async function main(): Promise<void> {
  const engepratAuthId: string = await getAuthUserId('cliente@exemplo.com');
  const victorAuthId: string = await getAuthUserId('victorf@sustentec-engenharia.com.br');

  const engepratClientId: string = await upsertClient('Engeprat', '03314057000153');
  const victorClientId: string = await upsertClient('Victor Leonardo Ferreira Coutinho', null);

  await db
    .insert(schema.responsibleTechs)
    .values({
      slug: 'ivon-benitez',
      display_name: 'Dra. Ivón Oristela Benítez González',
      active: true,
    })
    .onConflictDoNothing({ target: schema.responsibleTechs.slug });

  await db
    .insert(schema.profiles)
    .values([
      {
        id: engepratAuthId,
        display_name: 'Engeprat',
        email: 'cliente@exemplo.com',
        role: 'client',
      },
      {
        id: victorAuthId,
        display_name: 'Victor Leonardo Ferreira Coutinho',
        email: 'victorf@sustentec-engenharia.com.br',
        role: 'client',
      },
    ])
    .onConflictDoNothing({ target: schema.profiles.id });

  await db
    .insert(schema.userClients)
    .values([
      { user_id: engepratAuthId, client_id: engepratClientId },
      { user_id: victorAuthId, client_id: victorClientId },
    ])
    .onConflictDoNothing({
      target: [schema.userClients.user_id, schema.userClients.client_id],
    });

  const [clientCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.clients);
  const [techCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.responsibleTechs);
  const [profileCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.profiles);
  const [userClientCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.userClients);

  console.log(`[seed-data] clients=${clientCount.count}`);
  console.log(`[seed-data] responsible_techs=${techCount.count}`);
  console.log(`[seed-data] profiles=${profileCount.count}`);
  console.log(`[seed-data] user_clients=${userClientCount.count}`);
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
