import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Top-level Next.js middleware.
 *
 * Responsibilities:
 *  1. Refresh the Supabase session cookie on every request (only for the
 *     portal — marketing routes don't need it and we keep them untouched).
 *  2. Redirect unauthenticated visitors of `/portal/...` (other than
 *     `/portal/login`) to `/portal/login`.
 *  3. Redirect already-authenticated visitors of `/portal/login` to `/portal`.
 *
 * Per `@supabase/ssr` docs, do NOT add logic between `createServerClient` and
 * the first `getUser()` call — it would break token refresh.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPortal = pathname.startsWith('/portal');
  const isLogin = pathname === '/portal/login';

  // Marketing site is unaffected.
  if (!isPortal) return NextResponse.next({ request });

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  if (user && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = '/portal';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Only match portal routes. Marketing pages, static assets, and the
     * Next.js internals stay untouched so we don't pay session-refresh
     * latency on the public landing page.
     */
    '/portal/:path*',
  ],
};
