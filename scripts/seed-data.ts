// inline Drizzle handle — `lib/db/index.ts` is server-only and not importable from tsx scripts
import { and, eq, isNull, sql as drizzleSql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
// Central config service — `lib/config.ts` has no `import 'server-only'`, so
// it's safe to import from a tsx script (outside the Next.js runtime).
import { config } from '../lib/config';
import * as schema from '../lib/db/schema';

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

const sql = postgres(config.server.DATABASE_URL, { prepare: false, max: 1 });
const db = drizzle(sql, { schema });

type ProcessStatus = (typeof schema.processStatus.enumValues)[number];
type ProcessTipologia = (typeof schema.processTipologia.enumValues)[number];
type ProcessLicenseType = (typeof schema.processLicenseType.enumValues)[number];
type ProcessTaskStatus = (typeof schema.processTaskStatus.enumValues)[number];
type ProcessTaskPriority = (typeof schema.processTaskPriority.enumValues)[number];
type PaymentStatus = (typeof schema.paymentStatus.enumValues)[number];

interface SeedPayment {
  installment_no: number;
  /** numeric(12,2) column — string per the inferred Drizzle type. */
  amount: string;
  due_date: string;
  /** `paid` rows get `paid_at = due_date`; past-due `pending` rows exist on
   * purpose so the payment-overdue cron has work to do locally. */
  status: PaymentStatus;
}

interface SeedDocument {
  name: string;
  /** Relative URLs resolve against the portal origin (public/seed-docs/). */
  url: string;
}

interface SeedTask {
  title: string;
  summary: string | null;
  status: ProcessTaskStatus;
  priority: ProcessTaskPriority;
  due_date: string | null;
}

interface SeedProcess {
  code: string;
  name: string;
  city: string | null;
  status: ProcessStatus;
  status_label: string;
  /** Mock-derived target percentage. Used to pick milestones to mark checked. */
  progress: number;
  /**
   * São Paulo metro area coordinates so the dashboard map renders pins on the
   * seed dataset. Stored as strings to match the numeric(10,7) Drizzle column
   * inferred type.
   */
  latitude: string;
  longitude: string;
  // Parity fields (issue #32): every seeded process carries the same richness
  // as the example client so portal screens never render half-empty.
  tipologia: ProcessTipologia;
  environmental_agency: string;
  objective: string;
  started_at: string;
  due_date: string | null;
  finished_at: string | null;
  responsible_tech_slug: string;
  license_types: ProcessLicenseType[];
  classe_impacto: string;
  tempo_tramitacao: string;
  atividade_licenciada: string;
  payments: SeedPayment[];
  documents: SeedDocument[];
  tasks: SeedTask[];
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
const VICTORF_EMAIL = 'victorfr2026ok@gmail.com';
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

// 18 canonical responsible techs. Display names for the not-yet-known ones are
// placeholders — the alias-resolution mapping below is what actually matters
// for the Notion adapter. Idempotent on slug (onConflictDoNothing), so the
// original 3 keep their names. Typo variants collapse to one slug:
//   Maíra/Maira -> maira ; Guilherme/Gulherme -> guilherme
const RESPONSIBLE_TECHS: ReadonlyArray<{ slug: string; display_name: string }> = [
  { slug: 'ivon-benitez', display_name: 'Dra. Ivón Oristela Benítez González' },
  { slug: 'maira', display_name: 'Maíra' },
  { slug: 'guilherme', display_name: 'Guilherme' },
  { slug: 'victor', display_name: 'Victor' },
  { slug: 'rafael', display_name: 'Rafael' },
  { slug: 'bruna', display_name: 'Bruna' },
  { slug: 'camila', display_name: 'Camila' },
  { slug: 'daniel', display_name: 'Daniel' },
  { slug: 'eduardo', display_name: 'Eduardo' },
  { slug: 'fernanda', display_name: 'Fernanda' },
  { slug: 'gabriel', display_name: 'Gabriel' },
  { slug: 'helena', display_name: 'Helena' },
  { slug: 'igor', display_name: 'Igor' },
  { slug: 'juliana', display_name: 'Juliana' },
  { slug: 'leticia', display_name: 'Letícia' },
  { slug: 'marcos', display_name: 'Marcos' },
  { slug: 'natalia', display_name: 'Natália' },
  { slug: 'paulo', display_name: 'Paulo' },
];

// Every observed Notion `Responsável` label -> canonical tech slug. Stored
// verbatim in responsible_tech_aliases.notion_label; the adapter resolves
// case/diacritic-insensitively, but we keep the raw casing/accents here.
// Idempotent on (responsible_tech_id, notion_label).
const RESPONSIBLE_TECH_ALIASES: ReadonlyArray<{ slug: string; label: string }> = [
  { slug: 'ivon-benitez', label: 'Dra. Ivón Oristela Benítez González' },
  { slug: 'ivon-benitez', label: 'Ivón' },
  { slug: 'ivon-benitez', label: 'Ivon' },
  { slug: 'maira', label: 'Maíra' },
  { slug: 'maira', label: 'Maira' },
  { slug: 'guilherme', label: 'Guilherme' },
  { slug: 'guilherme', label: 'Gulherme' },
  { slug: 'victor', label: 'Victor' },
  { slug: 'rafael', label: 'Rafael' },
  { slug: 'bruna', label: 'Bruna' },
  { slug: 'camila', label: 'Camila' },
  { slug: 'daniel', label: 'Daniel' },
  { slug: 'eduardo', label: 'Eduardo' },
  { slug: 'fernanda', label: 'Fernanda' },
  { slug: 'gabriel', label: 'Gabriel' },
  { slug: 'helena', label: 'Helena' },
  { slug: 'igor', label: 'Igor' },
  { slug: 'juliana', label: 'Juliana' },
  { slug: 'leticia', label: 'Letícia' },
  { slug: 'marcos', label: 'Marcos' },
  { slug: 'natalia', label: 'Natália' },
  { slug: 'paulo', label: 'Paulo' },
];

// São Paulo city center as a reference — each process pin is offset by a
// small delta so the dashboard map shows them spread out instead of stacked.
// Payment plans: 3 installments per process; some `pending` rows are
// deliberately past-due so the overdue cron flips them locally.
const SEED_DOCS = {
  licencaPrevia: { name: 'Licença Prévia.pdf', url: '/seed-docs/licenca-previa.pdf' },
  parecerTecnico: { name: 'Parecer Técnico.pdf', url: '/seed-docs/parecer-tecnico.pdf' },
  comprovanteProtocolo: { name: 'Comprovante de Protocolo.pdf', url: '/seed-docs/comprovante-protocolo.pdf' },
} as const;

const ENGEPRAT_PROCESSES: ReadonlyArray<SeedProcess> = [
  {
    code: 'CC 26-004',
    name: 'Enge Prat - UNOPS Planos',
    city: null,
    status: 'andamento',
    status_label: 'Em analise',
    progress: 65,
    latitude: '-23.5505000',
    longitude: '-46.6333000',
    tipologia: 'licenciamento',
    environmental_agency: 'INEA',
    objective: 'Licenciamento ambiental do empreendimento UNOPS Planos.',
    started_at: '2026-01-15',
    due_date: '2026-06-30',
    finished_at: null,
    responsible_tech_slug: 'maira',
    license_types: ['LP', 'LI'],
    classe_impacto: 'Classe 2',
    tempo_tramitacao: '8 a 12 meses',
    atividade_licenciada: 'Infraestrutura de saneamento',
    payments: [
      { installment_no: 1, amount: '8500.00', due_date: '2026-02-10', status: 'paid' },
      { installment_no: 2, amount: '8500.00', due_date: '2026-05-20', status: 'pending' },
      { installment_no: 3, amount: '8500.00', due_date: '2026-08-10', status: 'pending' },
    ],
    documents: [SEED_DOCS.licencaPrevia, SEED_DOCS.comprovanteProtocolo],
    tasks: [
      {
        title: 'Enviar EIA/RIMA atualizado',
        summary: 'O órgão ambiental solicitou a versão revisada do estudo de impacto.',
        status: 'aberta',
        priority: 'alta',
        due_date: '2026-06-20',
      },
      {
        title: 'Assinar procuração',
        summary: 'Procuração necessária para representação junto ao INEA.',
        status: 'aguardando_cliente',
        priority: 'media',
        due_date: null,
      },
    ],
  },
  {
    code: 'CC 26-016',
    name: 'Licenças Enge Prat - Niterói',
    city: 'Niterói - RJ',
    status: 'andamento',
    status_label: 'Aguardando docs',
    progress: 25,
    latitude: '-23.5805000',
    longitude: '-46.6633000',
    tipologia: 'licenciamento',
    environmental_agency: 'INEA',
    objective: 'Obtenção das licenças de instalação da unidade de Niterói.',
    started_at: '2026-03-01',
    due_date: '2026-10-15',
    finished_at: null,
    responsible_tech_slug: 'guilherme',
    license_types: ['LI'],
    classe_impacto: 'Classe 3',
    tempo_tramitacao: '6 a 9 meses',
    atividade_licenciada: 'Operação industrial',
    payments: [
      { installment_no: 1, amount: '6200.00', due_date: '2026-03-20', status: 'paid' },
      { installment_no: 2, amount: '6200.00', due_date: '2026-07-20', status: 'pending' },
      { installment_no: 3, amount: '6200.00', due_date: '2026-10-20', status: 'pending' },
    ],
    documents: [SEED_DOCS.comprovanteProtocolo],
    tasks: [
      {
        title: 'Enviar plano de emergência atualizado',
        summary: 'Documentação pendente apontada na triagem do processo.',
        status: 'aberta',
        priority: 'urgente',
        due_date: '2026-06-15',
      },
    ],
  },
  {
    code: 'CC 26-017',
    name: 'Laudo de Avaliação Cautelar de Vizinhança - Enge Prat',
    city: null,
    status: 'finalizado',
    status_label: 'Concluido',
    progress: 100,
    latitude: '-23.5205000',
    longitude: '-46.6033000',
    tipologia: 'laudo',
    environmental_agency: 'Prefeitura de Niterói',
    objective: 'Laudo cautelar de vizinhança para a obra da unidade Centro.',
    started_at: '2025-11-10',
    due_date: '2026-02-28',
    finished_at: '2026-02-20',
    responsible_tech_slug: 'ivon-benitez',
    license_types: ['LAS'],
    classe_impacto: 'Classe 1',
    tempo_tramitacao: '3 a 4 meses',
    atividade_licenciada: 'Avaliação de vizinhança',
    payments: [
      { installment_no: 1, amount: '4500.00', due_date: '2025-12-01', status: 'paid' },
      { installment_no: 2, amount: '4500.00', due_date: '2026-01-15', status: 'paid' },
      { installment_no: 3, amount: '4500.00', due_date: '2026-02-28', status: 'paid' },
    ],
    documents: [SEED_DOCS.parecerTecnico, SEED_DOCS.licencaPrevia],
    tasks: [],
  },
];

const VICTOR_PROCESSES: ReadonlyArray<SeedProcess> = [
  {
    code: 'CC 26-021',
    name: 'Fazenda Sapucay',
    city: 'Cachoeiras de Macacu - RJ',
    status: 'andamento',
    status_label: 'Em andamento',
    progress: 50,
    latitude: '-23.5605000',
    longitude: '-46.6433000',
    tipologia: 'licenciamento',
    environmental_agency: 'INEA',
    objective: 'Licenciamento ambiental das atividades agropecuárias da fazenda.',
    started_at: '2026-02-01',
    due_date: '2026-09-30',
    finished_at: null,
    responsible_tech_slug: 'victor',
    license_types: ['LP'],
    classe_impacto: 'Classe 2',
    tempo_tramitacao: '8 a 10 meses',
    atividade_licenciada: 'Atividade agropecuária',
    payments: [
      { installment_no: 1, amount: '5000.00', due_date: '2026-02-15', status: 'paid' },
      { installment_no: 2, amount: '5000.00', due_date: '2026-05-15', status: 'pending' },
      { installment_no: 3, amount: '5000.00', due_date: '2026-08-15', status: 'pending' },
    ],
    documents: [SEED_DOCS.comprovanteProtocolo, SEED_DOCS.licencaPrevia],
    tasks: [
      {
        title: 'Enviar matrícula atualizada do imóvel',
        summary: 'Necessária para instruir o requerimento da licença prévia.',
        status: 'aberta',
        priority: 'alta',
        due_date: '2026-06-25',
      },
      {
        title: 'Confirmar coordenadas das nascentes',
        summary: 'Validação de campo das APPs mapeadas.',
        status: 'em_andamento',
        priority: 'media',
        due_date: '2026-07-10',
      },
    ],
  },
  {
    code: 'CC 24-016',
    name: 'Hydroen',
    city: 'Nova Friburgo - RJ',
    status: 'andamento',
    status_label: 'Em andamento',
    progress: 50,
    latitude: '-23.5405000',
    longitude: '-46.6233000',
    tipologia: 'licenciamento',
    environmental_agency: 'INEA',
    objective: 'Licenciamento da central geradora hidrelétrica Hydroen.',
    started_at: '2024-06-10',
    due_date: '2026-08-31',
    finished_at: null,
    responsible_tech_slug: 'rafael',
    license_types: ['LP', 'LI'],
    classe_impacto: 'Classe 4',
    tempo_tramitacao: '18 a 24 meses',
    atividade_licenciada: 'Geração de energia hidrelétrica',
    payments: [
      { installment_no: 1, amount: '12000.00', due_date: '2024-07-01', status: 'paid' },
      { installment_no: 2, amount: '12000.00', due_date: '2026-05-01', status: 'pending' },
      { installment_no: 3, amount: '12000.00', due_date: '2026-09-01', status: 'pending' },
    ],
    documents: [SEED_DOCS.parecerTecnico],
    tasks: [
      {
        title: 'Responder exigência técnica do INEA',
        summary: 'Exigência nº 1 sobre o estudo hidrológico complementar.',
        status: 'aberta',
        priority: 'urgente',
        due_date: '2026-06-18',
      },
    ],
  },
  {
    code: 'CC 24-015',
    name: 'IF Hydroen',
    city: 'Nova Friburgo - RJ',
    status: 'acompanhamento',
    status_label: 'Em acompanhamento',
    progress: 0,
    latitude: '-23.5705000',
    longitude: '-46.6533000',
    tipologia: 'consultoria',
    environmental_agency: 'INEA',
    objective: 'Acompanhamento do inventário florestal da área da CGH.',
    started_at: '2024-05-20',
    due_date: null,
    finished_at: null,
    responsible_tech_slug: 'rafael',
    license_types: ['outros'],
    classe_impacto: 'Classe 2',
    tempo_tramitacao: 'Contínuo',
    atividade_licenciada: 'Inventário florestal',
    payments: [
      { installment_no: 1, amount: '3500.00', due_date: '2024-06-15', status: 'paid' },
      { installment_no: 2, amount: '3500.00', due_date: '2024-09-15', status: 'paid' },
      { installment_no: 3, amount: '3500.00', due_date: '2024-12-15', status: 'paid' },
    ],
    documents: [SEED_DOCS.parecerTecnico],
    tasks: [],
  },
  {
    code: 'CC 24-017',
    name: 'ASV Fluminense Industrial',
    city: 'Macaé - RJ',
    status: 'acompanhamento',
    status_label: 'Em acompanhamento',
    progress: 0,
    latitude: '-23.5305000',
    longitude: '-46.6133000',
    tipologia: 'licenciamento',
    environmental_agency: 'INEA',
    objective: 'Autorização de supressão de vegetação para a planta industrial.',
    started_at: '2024-07-05',
    due_date: null,
    finished_at: null,
    responsible_tech_slug: 'guilherme',
    license_types: ['outros'],
    classe_impacto: 'Classe 3',
    tempo_tramitacao: '10 a 14 meses',
    atividade_licenciada: 'Supressão de vegetação',
    payments: [
      { installment_no: 1, amount: '4200.00', due_date: '2024-08-01', status: 'paid' },
      { installment_no: 2, amount: '4200.00', due_date: '2024-11-01', status: 'paid' },
      { installment_no: 3, amount: '4200.00', due_date: '2025-02-01', status: 'paid' },
    ],
    documents: [SEED_DOCS.comprovanteProtocolo],
    tasks: [],
  },
  {
    code: 'CC 24-044',
    name: 'Demarcação de Faixa - Fluminense Industrial',
    city: 'Macaé - RJ',
    status: 'acompanhamento',
    status_label: 'Em acompanhamento',
    progress: 0,
    latitude: '-23.5905000',
    longitude: '-46.6733000',
    tipologia: 'consultoria',
    environmental_agency: 'INEA',
    objective: 'Demarcação da faixa marginal de proteção do córrego limítrofe.',
    started_at: '2024-09-12',
    due_date: null,
    finished_at: null,
    responsible_tech_slug: 'guilherme',
    license_types: ['outros'],
    classe_impacto: 'Classe 1',
    tempo_tramitacao: '4 a 6 meses',
    atividade_licenciada: 'Demarcação de faixa marginal',
    payments: [
      { installment_no: 1, amount: '2800.00', due_date: '2024-10-01', status: 'paid' },
      { installment_no: 2, amount: '2800.00', due_date: '2025-01-01', status: 'paid' },
      { installment_no: 3, amount: '2800.00', due_date: '2025-04-01', status: 'paid' },
    ],
    documents: [SEED_DOCS.parecerTecnico],
    tasks: [],
  },
  {
    code: 'CC 24-061',
    name: 'Programas Ambientais LI Hydroen',
    city: 'Nova Friburgo - RJ',
    status: 'acompanhamento',
    status_label: 'Em acompanhamento',
    progress: 0,
    latitude: '-23.5105000',
    longitude: '-46.5933000',
    tipologia: 'monitoramento',
    environmental_agency: 'INEA',
    objective: 'Execução dos programas ambientais condicionantes da LI.',
    started_at: '2024-11-03',
    due_date: null,
    finished_at: null,
    responsible_tech_slug: 'bruna',
    license_types: ['LI'],
    classe_impacto: 'Classe 4',
    tempo_tramitacao: 'Contínuo (vigência da LI)',
    atividade_licenciada: 'Programas de monitoramento ambiental',
    payments: [
      { installment_no: 1, amount: '6000.00', due_date: '2024-12-01', status: 'paid' },
      { installment_no: 2, amount: '6000.00', due_date: '2025-06-01', status: 'paid' },
      { installment_no: 3, amount: '6000.00', due_date: '2026-06-01', status: 'pending' },
    ],
    documents: [SEED_DOCS.parecerTecnico],
    tasks: [
      {
        title: 'Agendar campanha de monitoramento trimestral',
        summary: 'Campanha de qualidade da água do 2º trimestre.',
        status: 'aberta',
        priority: 'media',
        due_date: '2026-06-30',
      },
    ],
  },
  {
    code: 'CC 25-072',
    name: 'LO Hydroen',
    city: 'Nova Friburgo - RJ',
    status: 'acompanhamento',
    status_label: 'Em acompanhamento',
    progress: 0,
    latitude: '-23.5505000',
    longitude: '-46.5833000',
    tipologia: 'licenciamento',
    environmental_agency: 'INEA',
    objective: 'Obtenção da licença de operação da CGH Hydroen.',
    started_at: '2025-03-18',
    due_date: '2026-12-20',
    finished_at: null,
    responsible_tech_slug: 'rafael',
    license_types: ['LO'],
    classe_impacto: 'Classe 4',
    tempo_tramitacao: '12 a 18 meses',
    atividade_licenciada: 'Geração de energia hidrelétrica',
    payments: [
      { installment_no: 1, amount: '7500.00', due_date: '2025-04-01', status: 'paid' },
      { installment_no: 2, amount: '7500.00', due_date: '2026-07-01', status: 'pending' },
      { installment_no: 3, amount: '7500.00', due_date: '2026-12-01', status: 'pending' },
    ],
    documents: [SEED_DOCS.comprovanteProtocolo],
    tasks: [],
  },
  {
    code: 'CC 25-073',
    name: 'Renovação LO - Fazenda Sapucay',
    city: 'Cachoeiras de Macacu - RJ',
    status: 'acompanhamento',
    status_label: 'Em acompanhamento',
    progress: 0,
    latitude: '-23.5505000',
    longitude: '-46.6833000',
    tipologia: 'licenciamento',
    environmental_agency: 'INEA',
    objective: 'Renovação da licença de operação das atividades da fazenda.',
    started_at: '2025-05-02',
    due_date: '2026-11-30',
    finished_at: null,
    responsible_tech_slug: 'victor',
    license_types: ['renovacao'],
    classe_impacto: 'Classe 2',
    tempo_tramitacao: '6 a 8 meses',
    atividade_licenciada: 'Atividade agropecuária',
    payments: [
      { installment_no: 1, amount: '3200.00', due_date: '2025-06-01', status: 'paid' },
      { installment_no: 2, amount: '3200.00', due_date: '2026-06-01', status: 'pending' },
      { installment_no: 3, amount: '3200.00', due_date: '2026-11-01', status: 'pending' },
    ],
    documents: [SEED_DOCS.licencaPrevia],
    tasks: [],
  },
  {
    code: 'CC 25-119',
    name: 'Laudo Maraú',
    city: 'Maraú - BA',
    status: 'finalizado',
    status_label: 'Concluido',
    progress: 100,
    latitude: '-23.5805000',
    longitude: '-46.6033000',
    tipologia: 'laudo',
    environmental_agency: 'INEMA',
    objective: 'Laudo técnico ambiental da gleba de Maraú.',
    started_at: '2025-08-11',
    due_date: '2025-12-19',
    finished_at: '2025-12-15',
    responsible_tech_slug: 'ivon-benitez',
    license_types: ['LAS'],
    classe_impacto: 'Classe 1',
    tempo_tramitacao: '3 a 5 meses',
    atividade_licenciada: 'Avaliação técnica ambiental',
    payments: [
      { installment_no: 1, amount: '3800.00', due_date: '2025-09-01', status: 'paid' },
      { installment_no: 2, amount: '3800.00', due_date: '2025-10-15', status: 'paid' },
      { installment_no: 3, amount: '3800.00', due_date: '2025-12-19', status: 'paid' },
    ],
    documents: [SEED_DOCS.parecerTecnico, SEED_DOCS.comprovanteProtocolo],
    tasks: [],
  },
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

/** Optional cadastral payload — anything provided is patched on every run so
 * adjusting the seed values re-populates existing rows. */
interface SeedClientCadastral {
  contact_name?: string;
  contact_role?: string;
  contact_email?: string;
  contact_phone?: string;
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_postal_code?: string;
}

async function upsertClient(
  name: string,
  cnpjFilter: string | null,
  cadastral?: SeedClientCadastral,
): Promise<string> {
  const existing = await db
    .select({ id: schema.clients.id })
    .from(schema.clients)
    .where(eq(schema.clients.name, name))
    .limit(1);
  if (existing.length > 0) {
    if (cadastral) {
      await db
        .update(schema.clients)
        .set({ ...cadastral, updated_at: drizzleSql`now()` })
        .where(eq(schema.clients.id, existing[0].id));
    }
    return existing[0].id;
  }
  const inserted = await db
    .insert(schema.clients)
    .values({ name, notion_cnpj_filter: cnpjFilter, ...cadastral })
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
  techIdBySlug: Map<string, string>,
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

    // Every seed-managed field is patched on re-runs so adjusting the tables
    // above re-populates existing rows (parity requirement of issue #32).
    const baseValues = {
      name: row.name,
      city: row.city,
      status: row.status,
      status_label: row.status_label,
      latitude: row.latitude,
      longitude: row.longitude,
      tipologia: row.tipologia,
      environmental_agency: row.environmental_agency,
      objective: row.objective,
      started_at: row.started_at,
      due_date: row.due_date,
      finished_at: row.finished_at,
      responsible_tech_id: techIdBySlug.get(row.responsible_tech_slug) ?? null,
      classe_impacto: row.classe_impacto,
      tempo_tramitacao: row.tempo_tramitacao,
      atividade_licenciada: row.atividade_licenciada,
    };

    let processId: string;
    if (existing.length > 0) {
      processId = existing[0].id;
      await db
        .update(schema.processes)
        .set({ ...baseValues, updated_at: drizzleSql`now()` })
        .where(eq(schema.processes.id, processId));
    } else {
      const ins = await db
        .insert(schema.processes)
        .values({ client_id: clientId, code: row.code, ...baseValues })
        .returning({ id: schema.processes.id });
      processId = ins[0].id;
      inserted += 1;
    }

    // License types — delete+insert per process (mirrors the Notion repository).
    await db
      .delete(schema.processLicenseTypes)
      .where(eq(schema.processLicenseTypes.process_id, processId));
    if (row.license_types.length > 0) {
      await db.insert(schema.processLicenseTypes).values(
        row.license_types.map((lt) => ({
          process_id: processId,
          license_type: lt,
        })),
      );
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

    // Payments — upsert on (process_id, installment_no). `status` is NOT
    // overwritten on re-runs so a row the overdue cron flipped (or ops marked
    // paid) keeps its real state; amounts/due dates stay seed-managed.
    if (row.payments.length > 0) {
      await db
        .insert(schema.payments)
        .values(
          row.payments.map((p) => ({
            process_id: processId,
            installment_no: p.installment_no,
            amount: p.amount,
            due_date: p.due_date,
            status: p.status,
            paid_at: p.status === 'paid' ? new Date(p.due_date) : null,
          })),
        )
        .onConflictDoUpdate({
          target: [schema.payments.process_id, schema.payments.installment_no],
          set: {
            amount: drizzleSql`excluded.amount`,
            due_date: drizzleSql`excluded.due_date`,
            updated_at: drizzleSql`now()`,
          },
        });
    }

    // Documents — dedupe on (process_id, name).
    for (const doc of row.documents) {
      const docExisting = await db
        .select({ id: schema.processDocuments.id })
        .from(schema.processDocuments)
        .where(
          and(
            eq(schema.processDocuments.process_id, processId),
            eq(schema.processDocuments.name, doc.name),
          ),
        )
        .limit(1);
      if (docExisting.length === 0) {
        await db.insert(schema.processDocuments).values({
          process_id: processId,
          name: doc.name,
          url: doc.url,
        });
      }
    }

    // Tasks — dedupe on (process_id, title) among seed/system rows (those
    // without a notion_page_id), so Notion-synced tasks are never touched.
    for (const task of row.tasks) {
      const taskExisting = await db
        .select({ id: schema.processTasks.id })
        .from(schema.processTasks)
        .where(
          and(
            eq(schema.processTasks.process_id, processId),
            eq(schema.processTasks.title, task.title),
            isNull(schema.processTasks.notion_page_id),
          ),
        )
        .limit(1);
      if (taskExisting.length === 0) {
        await db.insert(schema.processTasks).values({
          process_id: processId,
          title: task.title,
          summary: task.summary,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date,
        });
      }
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
    // Idempotency: dedupe by (client_id, sent_at, subject, body). Including
    // `body` keeps two messages with the same subject/timestamp but different
    // bodies (e.g. a quick follow-up) from collapsing into one seed row.
    const existing = await db
      .select({ id: schema.messages.id })
      .from(schema.messages)
      .where(
        and(
          eq(schema.messages.client_id, clientId),
          eq(schema.messages.subject, row.subject),
          eq(schema.messages.sent_at, new Date(row.sent_at)),
          eq(schema.messages.body, row.body),
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

  const engepratClientId: string = await upsertClient(
    'Engeprat',
    '03314057000153',
    {
      contact_name: 'Maria Silva',
      contact_role: 'Diretora Técnica',
      contact_email: ENGEPRAT_EMAIL,
      contact_phone: '+55 11 3000-0000',
      address_street: 'Av. Paulista, 1000',
      address_city: 'São Paulo',
      address_state: 'SP',
      address_postal_code: '01310-100',
    },
  );
  const victorClientId: string = await upsertClient(
    'Victor Leonardo Ferreira Coutinho',
    null,
    {
      contact_name: 'Victor Leonardo Ferreira Coutinho',
      contact_role: 'Responsável Legal',
      contact_email: VICTORF_EMAIL,
      contact_phone: '+55 11 3100-0000',
      address_street: 'Rua Augusta, 500',
      address_city: 'São Paulo',
      address_state: 'SP',
      address_postal_code: '01304-000',
    },
  );

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

  // Responsible tech aliases — idempotent on (responsible_tech_id, notion_label).
  const techRows = await db
    .select({ id: schema.responsibleTechs.id, slug: schema.responsibleTechs.slug })
    .from(schema.responsibleTechs);
  const techIdBySlug = new Map(techRows.map((r) => [r.slug, r.id] as const));
  const aliasValues = RESPONSIBLE_TECH_ALIASES.map((a) => {
    const id = techIdBySlug.get(a.slug);
    return id ? { responsible_tech_id: id, notion_label: a.label } : null;
  }).filter((v): v is NonNullable<typeof v> => v !== null);
  if (aliasValues.length > 0) {
    await db
      .insert(schema.responsibleTechAliases)
      .values(aliasValues)
      .onConflictDoNothing({
        target: [
          schema.responsibleTechAliases.responsible_tech_id,
          schema.responsibleTechAliases.notion_label,
        ],
      });
  }

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
    techIdBySlug,
  );
  const newVictor = await seedProcessesForClient(
    victorClientId,
    VICTOR_PROCESSES,
    kindIdBySlug,
    techIdBySlug,
  );

  const newEngMsgs = await seedMessagesForClient(engepratClientId, ENGEPRAT_MESSAGES);
  const newVicMsgs = await seedMessagesForClient(victorClientId, VICTOR_MESSAGES);

  const [clientCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.clients);
  const [techCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.responsibleTechs);
  const [aliasCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.responsibleTechAliases);
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
  const [paymentCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.payments);
  const [documentCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.processDocuments);
  const [taskCount] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(schema.processTasks);

  console.log(`[seed-data] clients=${clientCount.count}`);
  console.log(`[seed-data] responsible_techs=${techCount.count}`);
  console.log(`[seed-data] responsible_tech_aliases=${aliasCount.count}`);
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
  console.log(`[seed-data] payments=${paymentCount.count}`);
  console.log(`[seed-data] process_documents=${documentCount.count}`);
  console.log(`[seed-data] process_tasks=${taskCount.count}`);
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
