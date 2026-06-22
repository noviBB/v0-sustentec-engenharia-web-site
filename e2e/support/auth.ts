/**
 * Programmatic auth helper for e2e setup.
 *
 * Signs a seeded user in against the local Supabase stack and writes the
 * resulting SSR session cookies into a Playwright `storageState` file, so flow
 * specs start already authenticated without driving the login UI.
 *
 * Implementation note: we use `@supabase/ssr`'s `createServerClient` with an
 * in-memory cookie jar. Its `setAll` callback hands us exactly the cookie
 * name/value pairs (already chunked + encoded the way the app's server/browser
 * clients expect to read them), which we then serialize to storageState.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { createServerClient } from '@supabase/ssr';

const DEFAULT_SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const DEFAULT_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
/** App base URL the cookies are scoped to. */
const APP_ORIGIN = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:3000';

export interface Credentials {
  email: string;
  password: string;
}

interface CookieRecord {
  name: string;
  value: string;
  options?: { path?: string; maxAge?: number; sameSite?: string };
}

/** Playwright storageState shape (cookies-only subset we populate). */
interface StorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'Strict' | 'Lax' | 'None';
  }>;
  origins: [];
}

function originHost(origin: string): string {
  return new URL(origin).hostname;
}

/**
 * Sign in with `credentials` and write a Playwright storageState JSON file to
 * `storagePath` containing the SSR auth cookies. Returns the authenticated
 * user's id. Throws if sign-in fails.
 */
export async function loginToStorageState(
  credentials: Credentials,
  storagePath: string,
): Promise<string> {
  const jar = new Map<string, string>();
  const captured: CookieRecord[] = [];

  const supabase = createServerClient(DEFAULT_SUPABASE_URL, DEFAULT_ANON_KEY, {
    cookies: {
      getAll() {
        return [...jar.entries()].map(([name, value]) => ({ name, value }));
      },
      setAll(cookiesToSet: CookieRecord[]) {
        for (const c of cookiesToSet) {
          jar.set(c.name, c.value);
          captured.push(c);
        }
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: credentials.email,
    password: credentials.password,
  });
  if (error) {
    throw new Error(
      `[e2e/auth] sign-in failed for ${credentials.email}: ${error.message}`,
    );
  }
  if (!data.user) {
    throw new Error(`[e2e/auth] sign-in returned no user for ${credentials.email}`);
  }

  const host = originHost(APP_ORIGIN);
  const oneWeekFromNow = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;

  // De-dup by name (last write wins), preserving the latest values from `jar`.
  const finalCookies = [...jar.entries()].map(([name, value]) => {
    const meta = captured.findLast((c) => c.name === name);
    return {
      name,
      value,
      domain: host,
      path: meta?.options?.path ?? '/',
      expires: meta?.options?.maxAge
        ? Math.floor(Date.now() / 1000) + meta.options.maxAge
        : oneWeekFromNow,
      httpOnly: false,
      secure: false,
      sameSite: 'Lax' as const,
    };
  });

  const state: StorageState = { cookies: finalCookies, origins: [] };

  await mkdir(dirname(storagePath), { recursive: true });
  await writeFile(storagePath, JSON.stringify(state, null, 2), 'utf8');

  return data.user.id;
}
