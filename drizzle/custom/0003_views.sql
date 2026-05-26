DROP VIEW IF EXISTS public.v_processes_with_progress;
CREATE VIEW public.v_processes_with_progress AS
SELECT p.*,
  LEAST(100, COALESCE(SUM(COALESCE(m.weight_override, k.default_weight))
                      FILTER (WHERE m.checked), 0))::int AS progress_percent,
  (SELECT COUNT(*)::int FROM public.process_tasks t
   WHERE t.process_id = p.id
     AND t.status NOT IN ('concluida','arquivada')
     AND t.deleted_at IS NULL) AS pendencias_count
FROM public.processes p
LEFT JOIN public.process_milestones m ON m.process_id = p.id
LEFT JOIN public.process_milestone_kinds k ON k.id = m.kind_id
GROUP BY p.id;
