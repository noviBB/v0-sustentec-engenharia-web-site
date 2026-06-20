-- Row-Level Security: read policy for the milestone-kinds lookup table.
--
-- `process_milestone_kinds` has RLS enabled (via the base schema) but `0005_rls.sql`
-- never gave it a policy. RLS-enabled + no-policy = deny-all for the `authenticated`
-- role, so the portal's `listMilestonesForClient` query (which INNER JOINs
-- `process_milestones` -> `process_milestone_kinds` under the user's session)
-- returned zero rows and the "Evolução" timeline rendered empty — even though the
-- dashboard progress bar worked, because it reads the SECURITY DEFINER view
-- `v_processes_with_progress` (which bypasses the caller's RLS).
--
-- `process_milestone_kinds` is a global lookup table (slug / label / ordinal /
-- default weight — no per-client data), so every authenticated user may read all
-- of it. The per-tenant scoping still lives on `process_milestones` itself, which
-- keeps its own client-scoped policy from `0005_rls.sql`.
--
-- Idempotent: ENABLE is a no-op if already on, and the policy is dropped before
-- being recreated, mirroring `0005_rls.sql`.

ALTER TABLE public.process_milestone_kinds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS process_milestone_kinds_select ON public.process_milestone_kinds;
CREATE POLICY process_milestone_kinds_select ON public.process_milestone_kinds
  FOR SELECT TO authenticated
  USING (true);
