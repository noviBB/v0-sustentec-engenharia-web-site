-- Issue #32 — "Resumo do enquadramento" fields + downloadable documents.
--
-- 1) Recreate `v_processes_with_progress`. Postgres expands `p.*` at view
--    creation time, so the columns added by drizzle migration 0003
--    (classe_impacto, tempo_tramitacao, atividade_licenciada) only become
--    visible through the view after a recreate. While here, the view also
--    surfaces two values the portal Resumo needs without extra roundtrips:
--      - responsible_tech_name (LEFT JOIN responsible_techs)
--      - license_types (text[] aggregate of process_license_types; cast to
--        text[] so postgres-js parses it as a JS array — enum[] would come
--        back as a raw string)
DROP VIEW IF EXISTS public.v_processes_with_progress;
CREATE VIEW public.v_processes_with_progress AS
SELECT p.*,
  rt.display_name AS responsible_tech_name,
  (SELECT COALESCE(array_agg(lt.license_type::text ORDER BY lt.license_type), ARRAY[]::text[])
   FROM public.process_license_types lt
   WHERE lt.process_id = p.id) AS license_types,
  LEAST(100, COALESCE(SUM(COALESCE(m.weight_override, k.default_weight))
                      FILTER (WHERE m.checked), 0))::int AS progress_percent,
  (SELECT COUNT(*)::int FROM public.process_tasks t
   WHERE t.process_id = p.id
     AND t.status NOT IN ('concluida','arquivada')
     AND t.deleted_at IS NULL) AS pendencias_count
FROM public.processes p
LEFT JOIN public.responsible_techs rt ON rt.id = p.responsible_tech_id
LEFT JOIN public.process_milestones m ON m.process_id = p.id
LEFT JOIN public.process_milestone_kinds k ON k.id = m.kind_id
GROUP BY p.id, rt.display_name;

-- DROP VIEW discards grants; 0005's blanket GRANT was point-in-time, so the
-- recreated view (and the new table below) need explicit grants.
GRANT SELECT ON public.v_processes_with_progress TO authenticated;

-- 2) RLS for process_documents (created by drizzle migration 0003).
--    Clients read documents of their own tenant's processes (same shape as
--    process_tasks_select in 0005); writes are staff-only — the portal is
--    download-only and rows come from seed/staff tooling.
ALTER TABLE public.process_documents ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_documents TO authenticated;

DROP POLICY IF EXISTS process_documents_select ON public.process_documents;
CREATE POLICY process_documents_select ON public.process_documents
  FOR SELECT TO authenticated
  USING (
    process_id IN (
      SELECT id FROM public.processes
      WHERE client_id IN (SELECT client_id FROM public.user_clients WHERE user_id = auth.uid())
    )
    OR public.is_staff()
  );

DROP POLICY IF EXISTS process_documents_write ON public.process_documents;
CREATE POLICY process_documents_write ON public.process_documents
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());
