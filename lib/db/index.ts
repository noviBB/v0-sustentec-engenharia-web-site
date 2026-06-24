import 'server-only';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { DbMode } from '@/lib/enums';
import { config } from '@/lib/config';
import * as schema from './schema';
import * as relations from './relations';

export { schema };
export * from './views';

// ---------------------------------------------------------------------------
// Connection: one postgres-js pool shared across all modes. Modes differ only
// in the SQL role the connection assumes for the lifetime of a transaction —
// `service` runs as the connection's default role (service_role, bypasses
// RLS); `anon` and `rls` `SET LOCAL role` and (for `rls`) propagate the
// Supabase JWT claims so `auth.uid()` and `auth.role()` resolve in policies.
// ---------------------------------------------------------------------------
const pgClient = postgres(config.server.DATABASE_URL, {
  prepare: false,
  max: 10,
});

const drizzleClient = drizzle(pgClient, {
  schema: { ...schema, ...relations },
});

export type DrizzleClient = typeof drizzleClient;
/**
 * The transaction object Drizzle passes into the callback of
 * `drizzleClient.transaction(...)`. We derive it from `Parameters` rather
 * than importing `PostgresJsTransaction<...>` directly because the latter
 * is generic over `TablesRelationalConfig` and re-spelling our schema in
 * that shape is brittle. Doing it this way keeps the type in lockstep
 * with whatever `drizzle({ schema, ...relations })` returns.
 */
export type DrizzleTx = Parameters<
  Parameters<DrizzleClient['transaction']>[0]
>[0];

// ---------------------------------------------------------------------------
// Session shape passed to `getDb('rls', session)` / `dbRls(session, ...)`.
//
// Accepts either:
//   - a Supabase server-session object with a `.user` (we lift `sub`/`role`/
//     `email` off `user`), OR
//   - a plain JWT-claims object (what `request.jwt.claims` ultimately holds).
//
// Whatever shape comes in, we normalise to a JSON string and feed it to
// `set_config('request.jwt.claims', ..., true)` inside the transaction.
// ---------------------------------------------------------------------------
export type JwtClaims = {
  sub: string;
  role?: string;
  email?: string;
  [key: string]: unknown;
};

export type SessionLike =
  | JwtClaims
  | {
      user: { id: string; email?: string | null; role?: string | null; [k: string]: unknown };
      [k: string]: unknown;
    };

// Discriminate the `SessionLike` union with zod instead of `as`. Both arms of
// the union carry a `[key: string]: unknown` index signature, so plain
// `in`-narrowing can't separate them — zod gives us a runtime discriminator
// that also produces a precisely-typed result.
//
// `.passthrough()` on the bare-claims arm preserves any extra JWT fields
// (`exp`, `aud`, custom claims) the caller passed, matching the previous
// behavior of returning the object unchanged.
const bareClaimsSchema = z
  .object({ sub: z.string() })
  .passthrough();

const userSessionSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().nullish(),
    role: z.string().nullish(),
  }),
});

function toClaims(session: SessionLike): JwtClaims {
  const bare = bareClaimsSchema.safeParse(session);
  if (bare.success) {
    return bare.data;
  }
  const withUser = userSessionSchema.safeParse(session);
  if (withUser.success) {
    return {
      sub: withUser.data.user.id,
      email: withUser.data.user.email ?? undefined,
      role: withUser.data.user.role ?? 'authenticated',
    };
  }
  throw new Error(
    'dbRls: session is missing a user id (no `sub` and no `user.id`)',
  );
}

// ---------------------------------------------------------------------------
// Mode = 'service'
//   The default Drizzle instance. Connects as the role baked into
//   DATABASE_URL (service_role on Supabase) and bypasses RLS. Use only from
//   scripts, the Notion adapter, seed jobs, and cron route handlers doing
//   system-wide work.
// ---------------------------------------------------------------------------
export function getDbService(): DrizzleClient {
  return drizzleClient;
}

// ---------------------------------------------------------------------------
// Mode = 'anon'
//   Runs the caller's work inside a transaction with `SET LOCAL role anon`.
//   Used for unauthenticated public writes (the marketing contact form).
//   Returns whatever the callback returns.
// ---------------------------------------------------------------------------
export async function dbAnon<T>(
  fn: (tx: DrizzleTx) => Promise<T>,
): Promise<T> {
  return drizzleClient.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL role anon`);
    try {
      return await fn(tx);
    } finally {
      // `SET LOCAL` reverts at commit/rollback, but be explicit so a connection
      // pool can't surprise us if the pool reuses the underlying socket.
      await tx.execute(sql`RESET role`);
    }
  });
}

// ---------------------------------------------------------------------------
// Mode = 'rls'
//   Runs the caller's work inside a transaction with `SET LOCAL role
//   authenticated` AND `set_config('request.jwt.claims', '<json>', true)`.
//   `auth.uid()` and `auth.role()` resolve from the propagated claims, so
//   every RLS policy sees the right user.
//
//   Helper-style on purpose: a transparent proxy would mean every method
//   chain has to open/commit its own transaction and that's where the
//   `set_config(... true)` scope is lost. With the helper, the caller's
//   block is one transaction, one role, one claim — no foot-guns.
// ---------------------------------------------------------------------------
export async function dbRls<T>(
  session: SessionLike,
  fn: (tx: DrizzleTx) => Promise<T>,
): Promise<T> {
  const claims = toClaims(session);
  const claimsJson = JSON.stringify(claims);

  return drizzleClient.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL role authenticated`);
    // `is_local = true` (third arg) so the setting only lives until the
    // transaction ends. Avoids leaking the previous user's claims onto the
    // next request that reuses this physical connection.
    await tx.execute(
      sql`SELECT set_config('request.jwt.claims', ${claimsJson}, true)`,
    );
    try {
      return await fn(tx);
    } finally {
      await tx.execute(sql`RESET role`);
    }
  });
}

// ---------------------------------------------------------------------------
// Factory shape (`getDb(mode, session?)`)
//   Thin dispatch over the three helpers above. `service` returns the bare
//   Drizzle client; `anon` and `rls` return a `run(fn)` adapter so callers
//   can write `await getDb('rls', session).run(tx => tx.select()...)` if they
//   prefer one entry point. Prefer the direct `dbRls` / `dbAnon` helpers for
//   new call sites — `getDb` exists so step-2 migrations and any future
//   `'service' | 'rls'` switches stay symmetrical.
// ---------------------------------------------------------------------------
export { DbMode };

export type TxRunner = {
  run<T>(fn: (tx: DrizzleTx) => Promise<T>): Promise<T>;
};

export function getDb(mode: DbMode.Service): DrizzleClient;
export function getDb(mode: DbMode.Anon): TxRunner;
export function getDb(mode: DbMode.Rls, session: SessionLike): TxRunner;
export function getDb(
  mode: DbMode,
  session?: SessionLike,
): DrizzleClient | TxRunner {
  if (mode === DbMode.Service) return drizzleClient;
  if (mode === DbMode.Anon) {
    return {
      run<T>(fn: (tx: DrizzleTx) => Promise<T>): Promise<T> {
        return dbAnon(fn);
      },
    };
  }
  if (!session) {
    throw new Error("getDb('rls', session): session is required");
  }
  const s = session;
  return {
    run<T>(fn: (tx: DrizzleTx) => Promise<T>): Promise<T> {
      return dbRls(s, fn);
    },
  };
}
