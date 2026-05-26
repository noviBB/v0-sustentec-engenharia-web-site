import {
  date,
  integer,
  jsonb,
  numeric,
  pgView,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { processStatus, processTipologia } from './enums';

/**
 * `v_processes_with_progress` — defined in `drizzle/custom/0003_views.sql`.
 * `.existing()` tells drizzle-kit to emit no DDL for this object; we declare
 * the column shape here purely so Drizzle queries are typed.
 *
 * Column list mirrors `processes.*` plus the two aggregate columns the SQL
 * view computes (`progress_percent`, `pendencias_count`).
 */
export const vProcessesWithProgress = pgView('v_processes_with_progress', {
  id: uuid('id').notNull(),
  client_id: uuid('client_id').notNull(),
  code: text('code'),
  process_number: text('process_number'),
  name: text('name'),
  objective: text('objective'),
  observation: text('observation'),
  links: text('links'),
  status: processStatus('status').notNull(),
  status_label: text('status_label'),
  tipologia: processTipologia('tipologia'),
  responsible_tech_id: uuid('responsible_tech_id'),
  city: text('city'),
  latitude: numeric('latitude'),
  longitude: numeric('longitude'),
  environmental_agency: text('environmental_agency'),
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
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
  progress_percent: integer('progress_percent').notNull(),
  pendencias_count: integer('pendencias_count').notNull(),
}).existing();
