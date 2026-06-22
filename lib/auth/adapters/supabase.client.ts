import type { SessionLike } from '@/lib/db';
import type { AuthPort, AuthUser } from '@/lib/auth/port';
import { createClient as createBrowserSupabaseClient } from '@/lib/supabase/client';

/**
 * Supabase BROWSER adapter for the AuthPort seam.
 *
 * Deliberately NOT `server-only`: this is the half of the adapter that runs in
 * the client bundle. It only uses `@/lib/supabase/client` (createBrowserClient)
 * and never touches Next cookies, so importing it from a `"use client"`
 * component is safe. Server-only auth (getUser via cookies, signIn/signOut,
 * refreshSession) lives in `supabase.server.ts`.
 */

function toClaims(user: AuthUser): SessionLike {
  return {
    sub: user.id,
    email: user.email ?? undefined,
    role: 'authenticated',
  };
}

/**
 * Subscribe to auth state changes in the browser. Returns an unsubscribe fn.
 * Mirrors the previous `supabase.auth.onAuthStateChange` behavior: fires the
 * callback with the mapped `AuthUser` on a session, and `null` on sign-out.
 */
function onAuthStateChange(cb: (user: AuthUser | null) => void): () => void {
  const supabase = createBrowserSupabaseClient();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    cb(user ? { id: user.id, email: user.email ?? undefined } : null);
  });
  return () => {
    data.subscription.unsubscribe();
  };
}

async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? undefined };
}

/**
 * Client-side `AuthPort`. `signIn`/`signOut` are intentionally unsupported on
 * the browser side (those are server actions); they reject so a stray client
 * call fails loudly rather than silently bypassing the server boundary.
 */
export const clientAuthPort: AuthPort = {
  getCurrentUser,
  signIn() {
    return Promise.reject(
      new Error('signIn is server-only; call the server action instead'),
    );
  },
  signOut() {
    return Promise.reject(
      new Error('signOut is server-only; call the server action instead'),
    );
  },
  toClaims,
  onAuthStateChange,
};
