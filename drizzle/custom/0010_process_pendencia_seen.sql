-- RLS + grants for process_pendencia_seen (per-user-per-process pendências cursor).
-- A client reads/writes only its own rows; the blanket grant from 0005 was
-- point-in-time, so this table needs its own grant. Idempotent.

ALTER TABLE public.process_pendencia_seen ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS process_pendencia_seen_select ON public.process_pendencia_seen;
CREATE POLICY process_pendencia_seen_select ON public.process_pendencia_seen
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_staff());

DROP POLICY IF EXISTS process_pendencia_seen_insert ON public.process_pendencia_seen;
CREATE POLICY process_pendencia_seen_insert ON public.process_pendencia_seen
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS process_pendencia_seen_update ON public.process_pendencia_seen;
CREATE POLICY process_pendencia_seen_update ON public.process_pendencia_seen
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_pendencia_seen TO authenticated;
