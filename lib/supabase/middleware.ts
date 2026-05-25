import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refreshes the Supabase session on every Edge/Node middleware invocation.
 *
 * Per `@supabase/ssr` v0.6+ the `setAll` callback applies Cache-Control /
 * Expires / Pragma cookies to both the request cookies and the outgoing
 * `NextResponse.next({ request })` response so a CDN cannot cache an
 * authenticated user's response. Not wired to `middleware.ts` in this ticket —
 * that's #6's job.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  // Touch the session so the auth cookies refresh if needed.
  // Do NOT add logic between createServerClient and getUser — token refresh
  // depends on this being the first call.
  await supabase.auth.getUser();

  return supabaseResponse;
}
