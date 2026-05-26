import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/lib/env';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Canonical Supabase session refresh helper for Next.js middleware.
 *
 * Per `@supabase/ssr` guidance, every request that touches an authenticated
 * route must call `supabase.auth.getUser()` so the session cookies get
 * rotated when the access token is close to expiry. This helper wraps that
 * dance — `middleware.ts` at the repo root delegates here so there is exactly
 * one place that knows about cookie passthrough.
 *
 * Callers may inspect `request.cookies` after invocation (Supabase mutates
 * the underlying request when refreshing) — but in the common case they
 * should just return the `NextResponse` this function produces.
 *
 * IMPORTANT: do not insert any logic between `createServerClient` and
 * `getUser()`. Supabase relies on `getUser()` being the first call to detect
 * and refresh stale tokens.
 */
export async function updateSession(
  request: NextRequest,
): Promise<{ response: NextResponse; user: Awaited<ReturnType<typeof getUserSafe>> }> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const user = await getUserSafe(supabase);

  return { response: supabaseResponse, user };
}

async function getUserSafe(
  supabase: ReturnType<typeof createServerClient>,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
