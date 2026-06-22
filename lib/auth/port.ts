import type { SessionLike } from '@/lib/db';

/**
 * AuthPort — the provider-neutral seam for authentication.
 *
 * Everything the app needs from "auth" is expressed here in terms the rest of
 * the codebase already understands (`AuthUser`, `SessionLike`). The concrete
 * Supabase implementation lives in `lib/auth/adapters/*` and is the ONLY place
 * that imports `@supabase/*`. Swap the adapter (or inject `makeFakeAuthPort`
 * from `lib/auth/fake.ts` in tests) without touching any call site.
 *
 * RLS / claims contract is unchanged: `toClaims` produces the same
 * `{ sub, email, role: 'authenticated' }` shape the old `sessionForUser`
 * built, and `lib/db` consumes it exactly as before.
 */

/** Provider-neutral identity. The subset of fields the app actually reads. */
export type AuthUser = { id: string; email?: string };

export interface AuthPort {
  /** Server-side (RSC + server actions): resolves the signed-in user. */
  getCurrentUser(): Promise<AuthUser | null>;
  /** Server action: email/password sign-in. Never throws; never leaks provider errors. */
  signIn(email: string, password: string): Promise<{ ok: boolean; error?: string }>;
  /** Server action: ends the current session. */
  signOut(): Promise<void>;
  /** Builds the JWT-claims object `dbRls(session, ...)` propagates. */
  toClaims(user: AuthUser): SessionLike;
  /**
   * Optional client-side subscription to auth changes. Returns an
   * unsubscribe function. Only the browser adapter implements this; the
   * server adapter omits it.
   */
  onAuthStateChange?(cb: (user: AuthUser | null) => void): () => void;
}

/**
 * The singleton server-side port. Resolved from the Supabase server adapter.
 *
 * Why a re-export rather than baking the adapter into this file: `port.ts`
 * must stay import-safe from BOTH server and client bundles (it only carries
 * types + this server re-export). Client code never imports `authPort`; it
 * uses the dedicated client helper (`clientAuthPort` from
 * `lib/auth/adapters/supabase.client`) so the server-only Supabase cookie
 * machinery is never pulled into a client bundle.
 *
 * NOTE on middleware: session refresh is Supabase-cookie + NextRequest
 * specific (it mutates the request and emits a NextResponse), so it does NOT
 * fit the provider-neutral `AuthPort` interface. It is exported separately as
 * `refreshSession(request)` from `lib/auth/adapters/supabase.server`.
 */
export { authPort } from '@/lib/auth/adapters/supabase.server';
