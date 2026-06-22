import type { SessionLike } from '@/lib/db';
import type { AuthPort, AuthUser } from '@/lib/auth/port';

/**
 * In-memory `AuthPort` for tests. No `@supabase/*`, no cookies, no network.
 *
 * `getCurrentUser` returns the canned `user` (or null), `signIn` succeeds,
 * `signOut` is a no-op, and `toClaims` mirrors the real adapter's
 * `{ sub, email, role: 'authenticated' }` shape so RLS-claim assertions hold.
 * `onAuthStateChange` is a no-op subscription returning an unsubscribe fn.
 *
 * Test bodies are authored elsewhere; this only provides the double.
 */
export function makeFakeAuthPort(user: AuthUser | null): AuthPort {
  return {
    getCurrentUser() {
      return Promise.resolve(user);
    },
    signIn() {
      return Promise.resolve({ ok: true });
    },
    signOut() {
      return Promise.resolve();
    },
    toClaims(u: AuthUser): SessionLike {
      return {
        sub: u.id,
        email: u.email ?? undefined,
        role: 'authenticated',
      };
    },
    onAuthStateChange() {
      return () => {};
    },
  };
}
