-- RLS + grants for pendencia_seen (per-user-per-tenant notifications cursor).
-- A client reads/writes only its own row; the blanket grant from 0005 was
-- point-in-time, so this table needs its own grant. Idempotent.

ALTER TABLE public.pendencia_seen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pendencia_seen_select ON public.pendencia_seen;
CREATE POLICY pendencia_seen_select ON public.pendencia_seen
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS pendencia_seen_insert ON public.pendencia_seen;
CREATE POLICY pendencia_seen_insert ON public.pendencia_seen
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS pendencia_seen_update ON public.pendencia_seen;
CREATE POLICY pendencia_seen_update ON public.pendencia_seen
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pendencia_seen TO authenticated;
