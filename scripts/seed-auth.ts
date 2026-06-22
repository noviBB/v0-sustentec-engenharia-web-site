// Central config service — `lib/config.ts` has no `import 'server-only'`, so
// it's safe to import from a tsx script (outside the Next.js runtime).
import { config } from '../lib/config';

interface AuthUser {
  id: string;
  email?: string;
}

interface AdminUsersListResponse {
  users: AuthUser[];
}

const baseUrl: string = config.public.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey: string = config.server.SUPABASE_SERVICE_ROLE_KEY;

const adminHeaders: Record<string, string> = {
  Authorization: `Bearer ${serviceKey}`,
  apikey: serviceKey,
};

const seedUsers: ReadonlyArray<{ email: string; password: string }> = [
  {
    email: process.env.SEED_CLIENTE_EMAIL ?? 'cliente@exemplo.com',
    password: process.env.SEED_CLIENTE_PASSWORD ?? '123456',
  },
  {
    email: process.env.SEED_VICTOR_EMAIL ?? 'victorfr2026ok@gmail.com',
    password: process.env.SEED_VICTOR_PASSWORD ?? 'local-dev-victor',
  },
];

async function findUserByEmail(email: string): Promise<AuthUser | null> {
  // GoTrue's /admin/users ignores ?email — must list and match client-side.
  const perPage = 200;
  let page = 1;
  for (;;) {
    const url: string = `${baseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`;
    const res: Response = await fetch(url, { headers: adminHeaders });
    if (!res.ok) {
      const body: string = await res.text();
      throw new Error(`[seed-auth] GET ${url} failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as AdminUsersListResponse;
    if (!Array.isArray(data.users) || data.users.length === 0) return null;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function createUser(email: string, password: string): Promise<AuthUser> {
  const url: string = `${baseUrl}/auth/v1/admin/users`;
  const res: Response = await fetch(url, {
    method: 'POST',
    headers: { ...adminHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  if (res.status !== 200 && res.status !== 201) {
    const body: string = await res.text();
    throw new Error(`[seed-auth] POST ${url} failed: ${res.status} ${body}`);
  }
  return (await res.json()) as AuthUser;
}

async function main(): Promise<void> {
  for (const { email, password } of seedUsers) {
    const existing: AuthUser | null = await findUserByEmail(email);
    if (existing) {
      console.log(`[seed-auth] already exists: ${email}`);
      continue;
    }
    const created: AuthUser = await createUser(email, password);
    console.log(`[seed-auth] created: ${email} (${created.id})`);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
