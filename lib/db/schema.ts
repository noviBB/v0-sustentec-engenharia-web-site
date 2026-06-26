import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  AppointmentStatus,
  ContactSubmissionStatus,
  PaymentStatus,
  ProcessStatus,
  ProcessTaskPriority,
  ProcessTaskStatus,
  UserRole,
  appointmentStatus,
  contactSubmissionStatus,
  messageDirection,
  paymentStatus,
  processLicenseType,
  processStatus,
  processTaskPriority,
  processTaskStatus,
  processTipologia,
  userRole,
} from './enums';

export * from './enums';

// ---------------------------------------------------------------------------
// clients
// ---------------------------------------------------------------------------
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  notion_cnpj_filter: text('notion_cnpj_filter'),
  notion_database_id: text('notion_database_id'),
  notion_integration_token: text('notion_integration_token'),
  // Cadastral / contact fields surfaced in the portal's "Dados Cadastrais"
  // view. All nullable — older rows pre-date the columns and the portal
  // renders an em-dash when a value is missing.
  contact_name: text('contact_name'),
  contact_role: text('contact_role'),
  contact_email: text('contact_email'),
  contact_phone: text('contact_phone'),
  address_street: text('address_street'),
  address_city: text('address_city'),
  address_state: text('address_state'),
  address_postal_code: text('address_postal_code'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// profiles  (id = auth.users.id; FK added via custom SQL in Wave 2)
// ---------------------------------------------------------------------------
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey(),
  display_name: text('display_name'),
  email: text('email'),
  role: userRole('role').notNull().default(UserRole.Client),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// user_clients  (no FK on user_id; auth.users lives in another schema)
// ---------------------------------------------------------------------------
export const userClients = pgTable(
  'user_clients',
  {
    user_id: uuid('user_id').notNull(),
    client_id: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.user_id, t.client_id] })],
);

// ---------------------------------------------------------------------------
// pendencia_seen  (no FK on user_id; per-user-per-tenant notifications cursor)
// ---------------------------------------------------------------------------
export const pendenciaSeen = pgTable(
  'pendencia_seen',
  {
    user_id: uuid('user_id').notNull(),
    client_id: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    seen_at: timestamp('seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.user_id, t.client_id] })],
);

// ---------------------------------------------------------------------------
// process_pendencia_seen  (no FK on user_id; per-user-per-process pendências cursor)
// ---------------------------------------------------------------------------
export const processPendenciaSeen = pgTable(
  'process_pendencia_seen',
  {
    user_id: uuid('user_id').notNull(),
    process_id: uuid('process_id')
      .notNull()
      .references(() => processes.id, { onDelete: 'cascade' }),
    seen_at: timestamp('seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.user_id, t.process_id] })],
);

// ---------------------------------------------------------------------------
// responsible_techs
// ---------------------------------------------------------------------------
export const responsibleTechs = pgTable('responsible_techs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: text('slug').notNull().unique(),
  display_name: text('display_name').notNull(),
  email: text('email'),
  active: boolean('active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// responsible_tech_aliases
// ---------------------------------------------------------------------------
export const responsibleTechAliases = pgTable(
  'responsible_tech_aliases',
  {
    responsible_tech_id: uuid('responsible_tech_id')
      .notNull()
      .references(() => responsibleTechs.id, { onDelete: 'cascade' }),
    notion_label: text('notion_label').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.responsible_tech_id, t.notion_label] }),
  ],
);

// ---------------------------------------------------------------------------
// processes
// ---------------------------------------------------------------------------
export const processes = pgTable(
  'processes',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    client_id: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    code: text('code'),
    process_number: text('process_number'),
    name: text('name'),
    objective: text('objective'),
    observation: text('observation'),
    links: text('links'),
    status: processStatus('status').notNull().default(ProcessStatus.Andamento),
    status_label: text('status_label'),
    tipologia: processTipologia('tipologia'),
    responsible_tech_id: uuid('responsible_tech_id').references(
      () => responsibleTechs.id,
      { onDelete: 'set null' },
    ),
    city: text('city'),
    latitude: numeric('latitude', { precision: 10, scale: 7 }),
    longitude: numeric('longitude', { precision: 10, scale: 7 }),
    environmental_agency: text('environmental_agency'),
    // "Resumo do enquadramento" fields (issue #32). Free text — values come
    // from Notion properties that ops may not have created yet, so all
    // nullable and the portal renders an em-dash when missing.
    classe_impacto: text('classe_impacto'),
    tempo_tramitacao: text('tempo_tramitacao'),
    atividade_licenciada: text('atividade_licenciada'),
    started_at: date('started_at'),
    due_date: date('due_date'),
    finished_at: date('finished_at'),
    client_cnpj: text('client_cnpj'),
    applicant_cnpj: text('applicant_cnpj'),
    notion_page_id: text('notion_page_id'),
    notion_synced_at: timestamp('notion_synced_at', { withTimezone: true }),
    notion_etag: text('notion_etag'),
    notion_sync_errors: jsonb('notion_sync_errors'),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('processes_notion_page_id_uniq')
      .on(t.notion_page_id)
      .where(sql`deleted_at IS NULL`),
  ],
);

// ---------------------------------------------------------------------------
// process_license_types
// ---------------------------------------------------------------------------
export const processLicenseTypes = pgTable(
  'process_license_types',
  {
    process_id: uuid('process_id')
      .notNull()
      .references(() => processes.id, { onDelete: 'cascade' }),
    license_type: processLicenseType('license_type').notNull(),
  },
  (t) => [primaryKey({ columns: [t.process_id, t.license_type] })],
);

// ---------------------------------------------------------------------------
// process_milestone_kinds
// ---------------------------------------------------------------------------
export const processMilestoneKinds = pgTable('process_milestone_kinds', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  slug: text('slug').notNull().unique(),
  label_pt: text('label_pt').notNull(),
  default_weight: integer('default_weight').notNull().default(0),
  ordinal: integer('ordinal').notNull().default(0),
  active: boolean('active').notNull().default(true),
});

// ---------------------------------------------------------------------------
// process_milestones
// ---------------------------------------------------------------------------
export const processMilestones = pgTable(
  'process_milestones',
  {
    process_id: uuid('process_id')
      .notNull()
      .references(() => processes.id, { onDelete: 'cascade' }),
    kind_id: uuid('kind_id')
      .notNull()
      .references(() => processMilestoneKinds.id, { onDelete: 'cascade' }),
    checked: boolean('checked').notNull().default(false),
    checked_at: timestamp('checked_at', { withTimezone: true }),
    weight_override: integer('weight_override'),
  },
  (t) => [primaryKey({ columns: [t.process_id, t.kind_id] })],
);

// ---------------------------------------------------------------------------
// process_tasks
// ---------------------------------------------------------------------------
export const processTasks = pgTable(
  'process_tasks',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    process_id: uuid('process_id')
      .notNull()
      .references(() => processes.id, { onDelete: 'cascade' }),
    notion_page_id: text('notion_page_id'),
    title: text('title').notNull(),
    summary: text('summary'),
    status: processTaskStatus('status').notNull().default(ProcessTaskStatus.Aberta),
    priority: processTaskPriority('priority').notNull().default(ProcessTaskPriority.Media),
    due_date: date('due_date'),
    assignee_user_id: uuid('assignee_user_id'),
    parent_task_id: uuid('parent_task_id'),
    notion_synced_at: timestamp('notion_synced_at', { withTimezone: true }),
    notion_etag: text('notion_etag'),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('process_tasks_notion_page_id_uniq')
      .on(t.notion_page_id)
      .where(sql`deleted_at IS NULL`),
  ],
);

// ---------------------------------------------------------------------------
// process_documents  (download-only in the portal; rows written by seed/staff)
// ---------------------------------------------------------------------------
export const processDocuments = pgTable(
  'process_documents',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    process_id: uuid('process_id')
      .notNull()
      .references(() => processes.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    url: text('url').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [index('process_documents_process_id_idx').on(t.process_id)],
);

// ---------------------------------------------------------------------------
// messages  (`from_addr`/`to_addr` — `from` is a SQL keyword)
// ---------------------------------------------------------------------------
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    client_id: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    process_id: uuid('process_id').references(() => processes.id, {
      onDelete: 'set null',
    }),
    direction: messageDirection('direction').notNull(),
    from_addr: text('from_addr'),
    to_addr: text('to_addr'),
    subject: text('subject'),
    body: text('body'),
    read: boolean('read').notNull().default(false),
    read_at: timestamp('read_at', { withTimezone: true }),
    sent_at: timestamp('sent_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index('messages_client_sent_at_idx').on(t.client_id, t.sent_at)],
);

// ---------------------------------------------------------------------------
// appointments
// ---------------------------------------------------------------------------
export const appointments = pgTable(
  'appointments',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    client_id: uuid('client_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'cascade' }),
    process_id: uuid('process_id').references(() => processes.id, {
      onDelete: 'set null',
    }),
    responsible_tech_id: uuid('responsible_tech_id').references(
      () => responsibleTechs.id,
      { onDelete: 'set null' },
    ),
    title: text('title'),
    description: text('description'),
    starts_at: timestamp('starts_at', { withTimezone: true }).notNull(),
    ends_at: timestamp('ends_at', { withTimezone: true }),
    status: appointmentStatus('status').notNull().default(AppointmentStatus.Agendada),
    meet_url: text('meet_url'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // Prevents double-booking the same tech in the same slot. Active
    // appointments only — cancelled ones don't lock the slot.
    uniqueIndex('appointments_tech_slot_uniq')
      .on(t.responsible_tech_id, t.starts_at)
      .where(sql`status <> 'cancelada' AND responsible_tech_id IS NOT NULL`),
  ],
);

// ---------------------------------------------------------------------------
// contact_submissions
// ---------------------------------------------------------------------------
export const contactSubmissions = pgTable('contact_submissions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name'),
  email: text('email'),
  phone: text('phone'),
  message: text('message'),
  status: contactSubmissionStatus('status').notNull().default(ContactSubmissionStatus.Novo),
  submitted_at: timestamp('submitted_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  ip_hash: text('ip_hash'),
  source: text('source').notNull().default('marketing_site'),
  user_agent: text('user_agent'),
});

// ---------------------------------------------------------------------------
// payments
// ---------------------------------------------------------------------------
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    process_id: uuid('process_id')
      .notNull()
      .references(() => processes.id, { onDelete: 'cascade' }),
    installment_no: integer('installment_no').notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    due_date: date('due_date').notNull(),
    paid_at: timestamp('paid_at', { withTimezone: true }),
    status: paymentStatus('status').notNull().default(PaymentStatus.Pending),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex('payments_process_installment_uniq').on(
      t.process_id,
      t.installment_no,
    ),
    index('payments_status_due_date_idx').on(t.status, t.due_date),
  ],
);

// ---------------------------------------------------------------------------
// audit_log
// ---------------------------------------------------------------------------
export const auditLog = pgTable('audit_log', {
  id: bigint('id', { mode: 'bigint' })
    .primaryKey()
    .generatedByDefaultAsIdentity(),
  actor_id: uuid('actor_id'),
  action: text('action').notNull(),
  entity_type: text('entity_type'),
  entity_id: text('entity_id'),
  before: jsonb('before'),
  after: jsonb('after'),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
});
