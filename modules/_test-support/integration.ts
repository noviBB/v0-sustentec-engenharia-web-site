/**
 * Shared integration-test support.
 *
 * RLS in this app is keyed entirely off `auth.uid()` = the JWT `sub` claim,
 * matched against `public.user_clients` (no FK to `auth.users`). So tests can
 * provision fully isolated tenants with SYNTHETIC user ids — no GoTrue admin
 * calls required — and exercise the repos under `dbRls({ sub: <synthetic> })`.
 *
 * Every helper here uses service-mode (`getDbService`, RLS-bypass) to seed and
 * tear down, and hands back a tenant descriptor + an RLS session for it.
 *
 * IMPORTANT — gating without crashing collection:
 *   `@/lib/db` evaluates `lib/config.ts` (server env) at module load and THROWS
 *   when DATABASE_URL/secrets are absent. So integration specs must NOT import
 *   `@/lib/db` (or any repo that does) statically. Use `describeIntegration`,
 *   which `describe.skip`s when `DATABASE_URL` is unset, and load all DB code
 *   LAZILY (dynamic `import()`) inside hooks/tests via the helpers below.
 */
import { randomUUID } from 'node:crypto';
import { describe } from 'vitest';

import type { SessionLike } from '@/lib/db';

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

/**
 * `describe` that skips cleanly (with a visible reason) when no DB is wired.
 * Because the body callback of a skipped `describe` is still EVALUATED by
 * Vitest to register its (skipped) tests, the callbacks must not touch DB code
 * at evaluation time — only inside `beforeAll`/`it`, which won't run when
 * skipped. All DB access in this file is behind dynamic imports for that
 * reason.
 */
export const describeIntegration: typeof describe = hasDatabaseUrl
  ? describe
  : ((name: string, fn: () => void) =>
      describe.skip(
        `${name} [skipped: DATABASE_URL unset — start the local Supabase stack]`,
        fn,
      )) as unknown as typeof describe;

/** Lazy `@/lib/db` accessor — only resolved when actually running with a DB. */
async function db() {
  return import('@/lib/db');
}
async function schema() {
  return import('@/lib/db/schema');
}

export interface Tenant {
  /** clients.id */
  clientId: string;
  /** synthetic auth.uid() linked to the client via user_clients */
  userId: string;
  /** RLS session usable with dbRls(...) */
  session: SessionLike;
}

export interface IntegrationWorld {
  tenants: Tenant[];
  clientIds: string[];
}

export function newWorld(): IntegrationWorld {
  return { tenants: [], clientIds: [] };
}

/**
 * Create an isolated tenant: a fresh `clients` row + a `user_clients` link for
 * a brand-new synthetic user id. Service mode (bypasses RLS).
 */
export async function createTenant(
  world: IntegrationWorld,
  name = `IT Tenant ${randomUUID().slice(0, 8)}`,
): Promise<Tenant> {
  const { getDbService } = await db();
  const { clients, userClients } = await schema();
  const conn = getDbService();
  const [client] = await conn
    .insert(clients)
    .values({ name })
    .returning({ id: clients.id });
  const clientId = client!.id;
  const userId = randomUUID();
  await conn
    .insert(userClients)
    .values({ user_id: userId, client_id: clientId });

  const tenant: Tenant = { clientId, userId, session: { sub: userId } };
  world.tenants.push(tenant);
  world.clientIds.push(clientId);
  return tenant;
}

/** Insert a minimal process for a tenant (service mode). Returns its id. */
export async function createProcess(
  clientId: string,
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const { getDbService } = await db();
  const { processes } = await schema();
  const conn = getDbService();
  const [row] = await conn
    .insert(processes)
    .values({
      client_id: clientId,
      code: `P-${randomUUID().slice(0, 6)}`,
      name: 'Integration Process',
      status: 'andamento',
      ...overrides,
    } as never)
    .returning({ id: processes.id });
  return row!.id;
}

/**
 * Tear down everything created via this world. Deleting the client rows
 * cascades to processes/payments/messages/tasks/documents/etc. and the
 * user_clients links.
 */
export async function cleanupWorld(world: IntegrationWorld): Promise<void> {
  if (world.clientIds.length === 0) return;
  const { getDbService } = await db();
  const { clients } = await schema();
  const { inArray } = await import('drizzle-orm');
  await getDbService()
    .delete(clients)
    .where(inArray(clients.id, world.clientIds));
  world.tenants = [];
  world.clientIds = [];
}
