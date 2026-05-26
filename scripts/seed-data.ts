// inline Drizzle handle — `lib/db/index.ts` is server-only and not importable from tsx scripts
import { and, eq, sql as drizzleSql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../lib/db/schema';

interface AuthUser {
  id: string;
  email?: string;
}

interface AdminUsersListResponse {
  users: AuthUser[];
}

const SUPABASE_URL: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY: string | undefined = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABASE_URL: string | undefined = process.env.DATABASE_URL;

if (!SUPABASE_URL) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}
if (!SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required');
}

const baseUrl: string = SUPABASE_URL;
const serviceKey: string = SERVICE_ROLE_KEY;

const adminHeaders: Record<string, string> = {
  Authorization: `Bearer ${serviceKey}`,
  apikey: serviceKey,
};

const sql = postgres(DATABASE_URL, { prepare: false, max: 1 });
const db = drizzle(sql, { schema });

type ProcessStatus = (typeof schema.processStatus.enumValues)[number];

interface SeedProcess {
  code: string;
  name: string;
  city: string | null;
  status: ProcessStatus;
  status_label: string;
  /** Mock-derived target percentage. Used to pick milestones to mark checked. */
  progress: number;
}

interface SeedMessage {
  from_addr: string;
  to_addr: string;
  subject: string;
  body: string;
  sent_at: string;
  direction: 'inbound' | 'outbound';
  read: boolean;
  /** Tied back to the seeded process via `processes.code` (same tenant). */
  process_code?: string;
}

const ENGEPRAT_EMAIL = 'cliente@exemplo.com';
const VICTORF_EMAIL = 'victorf@sustentec-engenharia.com.br';
const SUSTENTEC_EMAIL = 'contato@sustentec-engenharia.com.br';

const MILESTONE_KINDS: ReadonlyArray<{
  slug: string;
  label_pt: string;
  default_weight: number;
  ordinal: number;
}> = [
  { slug: 'aceite_cliente', label_pt: 'Aceite do cliente', default_weight: 2, ordinal: 1 },
  { slug: 'analise_previa', label_pt: 'Análise prévia', default_weight: 10, ordinal: 2 },
  { slug: 'levantamento_campo', label_pt: 'Levantamento de campo', default_weight: 20, ordinal: 3 },
  { slug: 'juntar_documentacao', label_pt: 'Juntar documentação', default_weight: 10, ordinal: 4 },
  { slug: 'abertura_processo', label_pt: 'Abertura do processo', default_weight: 2, ordinal: 5 },
  { slug: 'assinatura_documentos', label_pt: 'Assinatura dos documentos', default_weight: 2, ordinal: 6 },
  { slug: 'art', label_pt: 'ART', default_weight: 2, ordinal: 7 },
  { slug: 'relatorio_preliminar', label_pt: 'Relatório preliminar', default_weight: 20, ordinal: 8 },
  { slug: 'exigencia_1', label_pt: 'EXIGÊNCIA 1', default_weight: 10, ordinal: 9 },
  { slug: 'exigencia_2', label_pt: 'EXIGÊNCIA 2', default_weight: 10, ordinal: 10 },
  { slug: 'exigencia_3', label_pt: 'EXIGÊNCIA 3', default_weight: 10, ordinal: 11 },
  { slug: 'revisao', label_pt: 'Revisão', default_weight: 15, ordinal: 12 },
  { slug: 'relatorio_final', label_pt: 'Relatório final', default_weight: 15, ordinal: 13 },
  { slug: 'entrega', label_pt: 'Entrega', default_weight: 2, ordinal: 14 },
];

const RESPONSIBLE_TECHS: ReadonlyArray<{ slug: string; display_name: string }> = [
  { slug: 'ivon-benitez', display_name: 'Dra. Ivón Oristela Benítez González' },
  { slug: 'maira', display_name: 'Maíra' },
  { slug: 'guilherme', display_name: 'Guilherme' },
];

const ENGEPRAT_PROCESSES: ReadonlyArray<SeedProcess> = [
  {
    code: 'CC 26-004',
    name: 'Enge Prat - UNOPS Planos',
    city: null,
    status: 'andamento',
    status_label: 'Em analise',
    progress: 65,
  },
  {
    code: 'CC 26-016',
    name: 'Licenças Enge Prat - Niterói',
    city: 'Niterói - RJ',
    status: 'andamento',
    status_label: 'Aguardando docs',
    progress: 25,
  },
  {
    code: 'CC 26-017',
    name: 'Laudo de Avaliação Cautelar de Vizinhança - Enge Prat',
    city: null,
    status: 'finalizado',
    status_label: 'Concluido',
    progress: 100,
  },
];

const VICTOR_PROCESSES: ReadonlyArray<SeedProcess> = [
  { code: 'CC 26-021', name: 'Fazenda Sapucay', city: null, status: 'andamento', status_label: 'Em andamento', progress: 50 },
  { code: 'CC 24-016', name: 'Hydroen', city: null, status: 'andamento', status_label: 'Em andamento', progress: 50 },
  { code: 'CC 24-015', name: 'IF Hydroen', city: null, status: 'acompanhamento', status_label: 'Em acompanhamento', progress: 0 },
  { code: 'CC 24-017', name: 'ASV Fluminense Industrial', city: null, status: 'acompanhamento', status_label: 'Em acompanhamento', progress: 0 },
  { code: 'CC 24-044', name: 'Demarcação de Faixa - Fluminense Industrial', city: null, status: 'acompanhamento', status_label: 'Em acompanhamento', progress: 0 },
  { code: 'CC 24-061', name: 'Programas Ambientais LI Hydroen', city: null, status: 'acompanhamento', status_label: 'Em acompanhamento', progress: 0 },
  { code: 'CC 25-072', name: 'LO Hydroen', city: null, status: 'acompanhamento', status_label: 'Em acompanhamento', progress: 0 },
  { code: 'CC 25-073', name: 'Renovação LO - Fazenda Sapucay', city: null, status: 'acompanhamento', status_label: 'Em acompanhamento', progress: 0 },
  { code: 'CC 25-119', name: 'Laudo Maraú', city: null, status: 'finalizado', status_label: 'Concluido', progress: 100 },
];

const ENGEPRAT_MESSAGES: ReadonlyArray<SeedMessage> = [
  {
    from_addr: SUSTENTEC_EMAIL,
    to_addr: ENGEPRAT_EMAIL,
    subject: 'Andamento do processo CC 26-004',
    body: 'Olá, informamos que o processo CC 26-004 foi encaminhado para análise técnica pelo órgão ambiental. Mantemos você atualizado sobre as próximas etapas.',
    sent_at: '2026-04-02T10:00:00Z',
    direction: 'inbound',
    read: false,
    process_code: 'CC 26-004',
  },
  {
    from_addr: ENGEPRAT_EMAIL,
    to_addr: SUSTENTEC_EMAIL,
    subject: 'Re: Andamento do processo CC 26-004',
    body: 'Obrigado pela atualização. Vocês têm previsão de retorno do órgão ambiental? Estamos coordenando o cronograma do empreendimento com base nesse parecer.',
    sent_at: '2026-04-03T16:12:00Z',
    direction: 'outbound',
    read: true,
    process_code: 'CC 26-004',
  },
  {
    from_addr: SUSTENTEC_EMAIL,
    to_addr: ENGEPRAT_EMAIL,
    subject: 'Documentação pendente — CC 26-016',
    body: 'Identificamos pendências de documentação no processo CC 26-016. Por favor, envie o EIA/RIMA e o plano de emergência atualizado.',
    sent_at: '2026-04-15T14:30:00Z',
    direction: 'inbound',
    read: true,
    process_code: 'CC 26-016',
  },
  {
    from_addr: ENGEPRAT_EMAIL,
    to_addr: SUSTENTEC_EMAIL,
    subject: 'Re: Documentação pendente — CC 26-016',
    body: 'Estamos finalizando a revisão do EIA/RIMA com a equipe técnica. Devemos enviar até o fim da próxima semana. O plano de emergência segue em anexo.',
    sent_at: '2026-04-16T09:45:00Z',
    direction: 'outbound',
    read: true,
    process_code: 'CC 26-016',
  },
];

const VICTOR_MESSAGES: ReadonlyArray<SeedMessage> = [
  {
    from_addr: SUSTENTEC_EMAIL,
    to_addr: VICTORF_EMAIL,
    subject: 'Boas-vindas ao Portal Sustentec',
    body: 'Olá Victor, seu acesso ao portal foi habilitado. Em breve disponibilizaremos os detalhes completos dos seus processos. Qualquer dúvida, fale conosco no WhatsApp.',
    sent_at: '2026-05-19T09:00:00Z',
    direction: 'inbound',
    read: false,
  },
  {
    from_addr: VICTORF_EMAIL,
    to_addr: SUSTENTEC_EMAIL,
    subject: 'Re: Boas-vindas ao Portal Sustentec',
    body: 'Obrigado pelo acesso. Quando os detalhes completos dos processos CC 24-016 (Hydroen) e CC 26-021 (Fazenda Sapucay) ficarem disponíveis, podem me avisar por aqui?',
    sent_at: '2026-05-19T11:20:00Z',
    direction: 'outbound',
    read: true,
  },
];

async function getAuthUserId(email: string): Promise<string> {
  // GoTrue's /admin/users ignores ?email — must list and match client-side.
  const perPage = 200;
  let page = 1;
  for (;;) {
    const url: string = `${baseUrl}/auth/v1/admin/users?page=${page}&per_page=${perPage}`;
    const res: Response = await fetch(url, { headers: adminHeaders });
    if (!res.ok) {
      const body: string = await res.text();
      throw new Error(`[seed-data] GET ${url} failed: ${res.status} ${body}`);
    }
    const data = (await res.json()) as AdminUsersListResponse;
    if (!Array.isArray(data.users) || data.users.length === 0) {
      throw new Error(`[seed-data] no auth user found for ${email} — run \`pnpm seed:auth\` first`);
    }
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < perPage) {
      throw new Error(`[seed-data] no auth user found for ${email} — run \`pnpm seed:auth\` first`);
    }
    page += 1;
  }
}

async function upsertClient(name: string, cnpjFilter: string | null): Promise<string> {
  const existing = await db
    .select({ id: schema.clients.id })
    .from(schema.clients)
    .where(eq(schema.clients.name, name))
    .limit(1);
  if (existing.length > 0) {
    return existing[0].id;
  }
  const inserted = await db
    .insert(schema.clients)
    .values({ name, notion_cnpj_filter: cnpjFilter })
    .returning({ id: schema.clients.id });
  return inserted[0].id;
}

/**
 * Selects milestone slugs to mark `checked = true` so the
 * `v_processes_with_progress` view returns a value close to `targetPct`.
 * Walks milestones in `ordinal` order and greedily adds the next one if it
 * brings the running sum closer to the target (without overshooting by more
 * than the tolerance). Skips milestones too heavy to fit.
 *
 * For 100% we just check everything (weight clamps to 100 in the view).
 */
function pickMilestonesForProgress(targetPct: number): Set<string> {
  if (targetPct <= 0) return new Set();
  if (targetPct >= 100) return new Set(MILESTONE_KINDS.map((k) => k.slug));

  const result = new Set<string>();
  let acc = 0;
  const tolerance = 5;
  for (const kind of MILESTONE_KINDS) {
    if (acc >= targetPct) break;
    const next = acc + kind.default_weight;
    if (next > targetPct + tolerance) {
      // Too heavy — skip and try the next (lighter) one instead.
      continue;
    }
    result.add(kind.slug);
    acc = next;
  }
  return result;
}

async function seedProcessesForClient(
  clientId: string,
  rows: ReadonlyArray<SeedProcess>,
  kindIdBySlug: Map<string, string>,
): Promise<number> {
  let inserted = 0;
  for (const row of rows) {
    const existing = await db
      .select({ id: schema.processes.id })
      .from(schema.processes)
      .where(
        and(
          eq(schema.processes.client_id, clientId),
          eq(schema.processes.code, row.code),
        ),
      )
      .limit(1);

    let processId: string;
    if (existing.length > 0) {
      processId = existing[0].id;
    } else {
      const ins = await db
        .insert(schema.processes)
        .values({
          client_id: clientId,
          code: row.code,
          name: row.name,
          city: row.city,
          status: row.status,
          status_label: row.status_label,
        })
        .returning({ id: schema.processes.id });
      processId = ins[0].id;
      inserted += 1;
    }

    const checked = pickMilestonesForProgress(row.progress);
    const milestoneValues = MILESTONE_KINDS.map((k) => ({
      process_id: processId,
      kind_id: kindIdBySlug.get(k.slug)!,
      checked: checked.has(k.slug),
      checked_at: checked.has(k.slug) ? new Date() : null,
    }));
    if (milestoneValues.length > 0) {
      // Upsert so re-running the seed keeps the mock-derived progress aligned
      // with the latest `pickMilestonesForProgress` algorithm.
      await db
        .insert(schema.processMilestones)
        .values(milestoneValues)
        .onConflictDoUpdate({
          target: [schema.processMilestones.process_id, schema.processMilestones.kind_id],
          set: {
            checked: drizzleSql`excluded.checked`,
            checked_at: drizzleSql`excluded.checked_at`,
          },
        });
    }
  }
  return inserted;
}

async function seedMessagesForClient(
  clientId: string,
  rows: ReadonlyArray<SeedMessage>,
): Promise<number> {
  // Build a (code -> id) map once per client.
  const procs = await db
    .select({ id: schema.processes.id, code: schema.processes.code })
    .from(schema.processes)
    .where(eq(schema.processes.client_id, clientId));
  const idByCode = new Map<string, string>();
  for (const p of procs) {
    if (p.code) idByCode.set(p.code, p.id);
  }

  let inserted = 0;
  for (const row of rows) {
    // Idempotency: look for existing row by (client_id, sent_at, subject).
    const existing = await db
      .select({ id: schema.messages.id })
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.client_id, clientId),
          eq(schema.messages.subject, row.subject),
          eq(schema.messages.sent_at, new Date(row.sent_at)),
        ),
      )
      .limit(1);
    if (existing.length > 0) continue;

    await db.insert(schema.messages).values({
      client_id: clientId,
      process_id: row.process_code ? idByCode.get(row.process_code) ?? null : null,
      direction: row.direction,
      from_addr: row.from_addr,
      to_addr: row.to_addr,
      subject: row.subject,
      body: row.body,
      read: row.read,
      sent_at: new Date(row.sent_at),
    });
    inserted += 1;
  }
  return inserted;
}

async function main(): Promise<void> {
  const engepratAuthId: string = await getAuthUserId(ENGEPRAT_EMAIL);
  const victorAuthId: string = await getAuthUserId(VICTORF_EMAIL);

  const engepratClientId: string = await upsertClient('Engeprat', '03314057000153');
  const victorClientId: string = await upsertClient('Victor Leonardo Ferreira Coutinho', null);

  // Milestone kinds — idempotent on slug.
  await db
    .insert(schema.processMilestoneKinds)
    .values(
      MILESTONE_KINDS.map((k) => ({
        slug: k.slug,
        label_pt: k.label_pt,
        default_weight: k.default_weight,
        ordinal: k.ordinal,
        active: true,
      })),
    )
    .onConflictDoNothing({ target: schema.processMilestoneKinds.slug });

  // Responsible techs — idempotent on slug.
  await db
    .insert(schema.responsibleTechs)
    .values(
      RESPONSIBLE_TECHS.map((t) => ({
        slug: t.slug,
        display_name: t.display_name,
        active: true,
      })),
    )
    .onConflictDoNothing({ target: schema.responsibleTechs.slug });

  // Profiles + user_clients — idempotent.
  await db
    .insert(schema.profiles)
    .values([
      { id: engepratAuthId, display_name: 'Engeprat', email: ENGEPRAT_EMAIL, role: 'client' },
      {
        id: victorAuthId,
        display_name: 'Victor Leonardo Ferreira Coutinho',
        email: VICTORF_EMAIL,
        role: 'client',
      },
    ])
    .onConflictDoNothing({ target: schema.profiles.id });

  await db
    .insert(schema.userClients)
    .values([
      { user_id: engepratAuthId, client_id: engepratClientId },
      { user_id: victorAuthId, client_id: victorClientId },
    ])
    .onConflictDoNothing({
      target: [schema.userClients.user_id, schema.userClients.client_id],
    });

  // Build kind slug -> id map for milestone inserts.
  const kindRows = await db
    .select({ id: schema.processMilestoneKinds.id, slug: schema.processMilestoneKinds.slug })
    .from(schema.processMilestoneKinds);
  const kindIdBySlug = new Map(kindRows.map((r) => [r.slug, r.id] as const));

  const newEngeprat = await seedProcessesForClient(
    engepratClientId,
    ENGEPRAT_PROCESSES,
    kindIdBySlug,
  );
  const newVictor = await seedProcessesForClient(victorClientId, VICTOR_PROCESSES, kindIdBySlug);

  const newEngMsgs = await seedMessagesForClient(engepratClientId, ENGEPRAT_MESSAGES);
  const newVicMsgs = await seedMessagesForClient(victorClientId, VICTOR_MESSAGES);

  const [clientCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.clients);
  const [techCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.responsibleTechs);
  const [profileCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.profiles);
  const [userClientCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.userClients);
  const [kindCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.processMilestoneKinds);
  const [processCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.processes);
  const [milestoneCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.processMilestones);
  const [messageCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.messages);

  console.log(`[seed-data] clients=${clientCount.count}`);
  console.log(`[seed-data] responsible_techs=${techCount.count}`);
  console.log(`[seed-data] profiles=${profileCount.count}`);
  console.log(`[seed-data] user_clients=${userClientCount.count}`);
  console.log(`[seed-data] process_milestone_kinds=${kindCount.count}`);
  console.log(
    `[seed-data] processes=${processCount.count} (new this run: engeprat=${newEngeprat}, victor=${newVictor})`,
  );
  console.log(`[seed-data] process_milestones=${milestoneCount.count}`);
  console.log(
    `[seed-data] messages=${messageCount.count} (new this run: engeprat=${newEngMsgs}, victor=${newVicMsgs})`,
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
    throw err;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
