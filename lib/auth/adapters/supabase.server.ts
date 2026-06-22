import 'server-only';
import type { NextRequest, NextResponse } from 'next/server';
import type { SessionLike } from '@/lib/db';
import type { AuthPort, AuthUser } from '@/lib/auth/port';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Supabase server adapter for the AuthPort seam.
 *
 * This file is the ONLY server-side place that talks to `@supabase/*` for
 * auth (via the `lib/supabase/*` wrappers). It is `server-only` because it
 * reaches into Next cookies through `createClient` / `updateSession`; the
 * browser `onAuthStateChange` lives in `supabase.client.ts` instead so the
 * cookie machinery never leaks into a client bundle.
 *
 * RLS contract: `toClaims` reproduces the exact shape the old
 * `sessionForUser` built — only the columns RLS reads (`sub`, `role`) plus
 * `email`. The role is hard-coded to `authenticated` to stay in sync with the
 * `SET LOCAL role authenticated` that `dbRls` issues inside the transaction.
 */

function toClaims(user: AuthUser): SessionLike {
  return {
    sub: user.id,
    email: user.email ?? undefined,
    role: 'authenticated',
  };
}

async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? undefined };
}

async function signIn(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

async function signOut(): Promise<void> {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    // Surface to the caller via a throw so the action's try/catch keeps its
    // existing "redirect regardless, flag the failure" behavior.
    throw new Error(error.message);
  }
}

/**
 * Middleware session refresh. NOT part of `AuthPort`: it is inherently
 * Supabase-cookie + NextRequest specific (mutates the request, returns a
 * NextResponse), so forcing it into the provider-neutral interface would leak
 * the cookie model. `middleware.ts` calls this directly.
 */
export async function refreshSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: AuthUser | null }> {
  const { response, user } = await updateSession(request);
  return {
    response,
    user: user ? { id: user.id, email: user.email ?? undefined } : null,
  };
}

/** Server-side singleton implementing the provider-neutral `AuthPort`. */
export const authPort: AuthPort = {
  getCurrentUser,
  signIn,
  signOut,
  toClaims,
};
