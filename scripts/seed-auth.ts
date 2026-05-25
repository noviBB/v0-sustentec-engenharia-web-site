interface AuthUser {
  id: string;
  email?: string;
}

interface AdminUsersListResponse {
  users: AuthUser[];
}

const SUPABASE_URL: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY: string | undefined = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}
if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

const baseUrl: string = SUPABASE_URL;
const serviceKey: string = SERVICE_ROLE_KEY;

const adminHeaders: Record<string, string> = {
  Authorization: `Bearer ${serviceKey}`,
  apikey: serviceKey,
};

const seedUsers: ReadonlyArray<{ email: string; password: string }> = [
  { email: 'cliente@exemplo.com', password: '123456' },
  { email: 'victorf@sustentec-engenharia.com.br', password: 'sustentec1' },
];

async function findUserByEmail(email: string): Promise<AuthUser | null> {
  const url: string = `${baseUrl}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
  const res: Response = await fetch(url, { headers: adminHeaders });
  if (!res.ok) {
    const body: string = await res.text();
    throw new Error(`[seed-auth] GET ${url} failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as AdminUsersListResponse;
  if (Array.isArray(data.users) && data.users.length > 0) {
    return data.users[0];
  }
  return null;
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
