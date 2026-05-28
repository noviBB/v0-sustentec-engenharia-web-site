-- Row-Level Security policies for the portal's tenant-scoped tables.
--
-- Companion to `lib/db/index.ts`'s `dbRls(session, ...)` helper. Every portal
-- request opens a transaction that:
--   1. `SET LOCAL role authenticated`
--   2. `set_config('request.jwt.claims', '<jwt>', true)`
-- so `auth.uid()` (which reads `request.jwt.claim.sub` via the
-- `current_setting`-based getter Supabase ships in the `auth` schema)
-- resolves to the user's id and the policies below filter accordingly.
--
-- Service callers (`getDbService()`, scripts, cron, the Notion adapter) keep
-- using the default service_role connection — RLS is bypassed for them. The
-- bypass is the system path, not the user path.
--
-- This file is idempotent: every CREATE POLICY is preceded by a matching
-- DROP POLICY IF EXISTS so re-running the migration is a no-op.

-- ---------------------------------------------------------------------------
-- Helper: is_staff()
--   Cached SECURITY DEFINER check so policies don't recurse into `profiles`
--   when the same query is itself reading `profiles`. Marked STABLE so the
--   planner can call it once per query.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('staff', 'admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- Enable RLS on every tenant-scoped table. `service_role` bypasses RLS by
-- default on Supabase, so the system connection is unaffected.
-- ---------------------------------------------------------------------------
ALTER TABLE public.clients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsible_techs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_license_types  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_milestones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log              ENABLE ROW LEVEL SECURITY;

-- Grants so `authenticated` can actually reach the tables once RLS lets it.
-- (Supabase normally pre-grants these, but doing it here makes the migration
-- self-contained for local databases and CI.)
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ---------------------------------------------------------------------------
-- profiles
--   Users see their own row; staff see everything.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS profiles_update ON public.profiles;
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_staff())
  WITH CHECK (id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.is_staff());

-- ---------------------------------------------------------------------------
-- user_clients
--   The link table itself: users see their own links, staff see all.
--   Writes are staff-only (admins assign tenants).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS user_clients_select ON public.user_clients;
CREATE POLICY user_clients_select ON public.user_clients
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS user_clients_insert ON public.user_clients;
CREATE POLICY user_clients_insert ON public.user_clients
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS user_clients_update ON public.user_clients;
CREATE POLICY user_clients_update ON public.user_clients
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS user_clients_delete ON public.user_clients;
CREATE POLICY user_clients_delete ON public.user_clients
  FOR DELETE TO authenticated
  USING (public.is_staff());

-- ---------------------------------------------------------------------------
-- clients
--   A user can read/update tenants they are linked to via user_clients.
--   Staff see all. INSERT/DELETE are staff-only.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS clients_select ON public.clients;
CREATE POLICY clients_select ON public.clients
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS clients_update ON public.clients;
CREATE POLICY clients_update ON public.clients
  FOR UPDATE TO authenticated
  USING (
    id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  )
  WITH CHECK (
    id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS clients_insert ON public.clients;
CREATE POLICY clients_insert ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS clients_delete ON public.clients;
CREATE POLICY clients_delete ON public.clients
  FOR DELETE TO authenticated
  USING (public.is_staff());

-- ---------------------------------------------------------------------------
-- responsible_techs
--   Shared lookup table — every authenticated user can read; staff write.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS responsible_techs_select ON public.responsible_techs;
CREATE POLICY responsible_techs_select ON public.responsible_techs
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS responsible_techs_write ON public.responsible_techs;
CREATE POLICY responsible_techs_write ON public.responsible_techs
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ---------------------------------------------------------------------------
-- processes
--   Tenant-scoped: bound to the user's user_clients tenants. Staff bypass.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS processes_select ON public.processes;
CREATE POLICY processes_select ON public.processes
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS processes_insert ON public.processes;
CREATE POLICY processes_insert ON public.processes
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS processes_update ON public.processes;
CREATE POLICY processes_update ON public.processes
  FOR UPDATE TO authenticated
  USING (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  )
  WITH CHECK (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS processes_delete ON public.processes;
CREATE POLICY processes_delete ON public.processes
  FOR DELETE TO authenticated
  USING (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

-- ---------------------------------------------------------------------------
-- process_license_types / process_milestones / process_tasks
--   Reached via the `processes` filter — a row is visible iff its parent
--   process is.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS process_license_types_select ON public.process_license_types;
CREATE POLICY process_license_types_select ON public.process_license_types
  FOR SELECT TO authenticated
  USING (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  );

DROP POLICY IF EXISTS process_license_types_write ON public.process_license_types;
CREATE POLICY process_license_types_write ON public.process_license_types
  FOR ALL TO authenticated
  USING (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  )
  WITH CHECK (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  );

DROP POLICY IF EXISTS process_milestones_select ON public.process_milestones;
CREATE POLICY process_milestones_select ON public.process_milestones
  FOR SELECT TO authenticated
  USING (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  );

DROP POLICY IF EXISTS process_milestones_write ON public.process_milestones;
CREATE POLICY process_milestones_write ON public.process_milestones
  FOR ALL TO authenticated
  USING (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  )
  WITH CHECK (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  );

DROP POLICY IF EXISTS process_tasks_select ON public.process_tasks;
CREATE POLICY process_tasks_select ON public.process_tasks
  FOR SELECT TO authenticated
  USING (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  );

DROP POLICY IF EXISTS process_tasks_write ON public.process_tasks;
CREATE POLICY process_tasks_write ON public.process_tasks
  FOR ALL TO authenticated
  USING (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  )
  WITH CHECK (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  );

-- ---------------------------------------------------------------------------
-- messages
--   client_id is on the row directly — straightforward tenant scope.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS messages_select ON public.messages;
CREATE POLICY messages_select ON public.messages
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS messages_insert ON public.messages;
CREATE POLICY messages_insert ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS messages_update ON public.messages;
CREATE POLICY messages_update ON public.messages
  FOR UPDATE TO authenticated
  USING (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  )
  WITH CHECK (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS messages_delete ON public.messages;
CREATE POLICY messages_delete ON public.messages
  FOR DELETE TO authenticated
  USING (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS appointments_select ON public.appointments;
CREATE POLICY appointments_select ON public.appointments
  FOR SELECT TO authenticated
  USING (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS appointments_insert ON public.appointments;
CREATE POLICY appointments_insert ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS appointments_update ON public.appointments;
CREATE POLICY appointments_update ON public.appointments
  FOR UPDATE TO authenticated
  USING (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  )
  WITH CHECK (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

DROP POLICY IF EXISTS appointments_delete ON public.appointments;
CREATE POLICY appointments_delete ON public.appointments
  FOR DELETE TO authenticated
  USING (
    client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    OR public.is_staff()
  );

-- ---------------------------------------------------------------------------
-- payments
--   No `client_id` on the row; tenant scope is reached through `processes`.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS payments_select ON public.payments;
CREATE POLICY payments_select ON public.payments
  FOR SELECT TO authenticated
  USING (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  );

DROP POLICY IF EXISTS payments_insert ON public.payments;
CREATE POLICY payments_insert ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  );

DROP POLICY IF EXISTS payments_update ON public.payments;
CREATE POLICY payments_update ON public.payments
  FOR UPDATE TO authenticated
  USING (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  )
  WITH CHECK (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  );

DROP POLICY IF EXISTS payments_delete ON public.payments;
CREATE POLICY payments_delete ON public.payments
  FOR DELETE TO authenticated
  USING (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  );

-- ---------------------------------------------------------------------------
-- contact_submissions
--   Public marketing form: anyone can INSERT; only staff SELECT/UPDATE.
--   `anon` is the role `dbAnon(...)` switches to.
-- ---------------------------------------------------------------------------
GRANT INSERT ON public.contact_submissions TO anon;

DROP POLICY IF EXISTS contact_submissions_insert_anon ON public.contact_submissions;
CREATE POLICY contact_submissions_insert_anon ON public.contact_submissions
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS contact_submissions_insert_auth ON public.contact_submissions;
CREATE POLICY contact_submissions_insert_auth ON public.contact_submissions
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS contact_submissions_select ON public.contact_submissions;
CREATE POLICY contact_submissions_select ON public.contact_submissions
  FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS contact_submissions_update ON public.contact_submissions;
CREATE POLICY contact_submissions_update ON public.contact_submissions
  FOR UPDATE TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS contact_submissions_delete ON public.contact_submissions;
CREATE POLICY contact_submissions_delete ON public.contact_submissions
  FOR DELETE TO authenticated
  USING (public.is_staff());

-- ---------------------------------------------------------------------------
-- audit_log
--   INSERT allowed for authenticated + anon (so the matching write paths
--   under `dbRls` / `dbAnon` can record their own audit row). SELECT is
--   staff-only — the audit log is an investigation tool. Service callers
--   bypass RLS so cron and the Notion adapter keep writing without
--   ceremony.
-- ---------------------------------------------------------------------------
GRANT INSERT ON public.audit_log TO anon;

DROP POLICY IF EXISTS audit_log_insert_anon ON public.audit_log;
CREATE POLICY audit_log_insert_anon ON public.audit_log
  FOR INSERT TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS audit_log_insert_auth ON public.audit_log;
CREATE POLICY audit_log_insert_auth ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS audit_log_select ON public.audit_log;
CREATE POLICY audit_log_select ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_staff());
