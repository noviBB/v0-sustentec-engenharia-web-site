import { NextResponse, type NextRequest } from 'next/server';
import { refreshSession } from '@/lib/auth/adapters/supabase.server';

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
 * The session refresh dance lives behind the auth adapter
 * (`lib/auth/adapters/supabase.server#refreshSession`, which wraps
 * `lib/supabase/middleware`) so the cookie passthrough logic stays in one
 * place — this file only owns the routing decisions.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPortal = pathname.startsWith('/portal');
  const isLogin = pathname === '/portal/login';

  // Marketing site is unaffected.
  if (!isPortal) return NextResponse.next({ request });

  const { response, user } = await refreshSession(request);

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

  return response;
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
