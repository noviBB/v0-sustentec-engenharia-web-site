-- One-off prod data fix for issue #41.2/3 — Victor's project status moves.
-- Run manually against prod (production data is not re-seeded). Idempotent.
-- Victor = client of victorfr2026ok@gmail.com (clients.name = 'Victor Leonardo Ferreira Coutinho').
-- IMPORTANT: confirm Victor's client_id before running (the WHERE scopes by code
-- AND client to avoid touching another tenant's identically-coded process).

BEGIN;

-- Resolve Victor's client_id. Prefer matching via the auth user -> user_clients,
-- falling back to the clients.name. Confirm this returns exactly ONE row first:
--   SELECT id, name FROM public.clients WHERE name ILIKE 'Victor Leonardo%';

WITH victor AS (
  SELECT id FROM public.clients WHERE name ILIKE 'Victor Leonardo%' LIMIT 1
)
UPDATE public.processes p
   SET status = 'finalizado', status_label = 'Finalizado', updated_at = now()
  FROM victor
 WHERE p.client_id = victor.id
   AND p.code IN ('CC 25-072', 'CC 25-073');

WITH victor AS (
  SELECT id FROM public.clients WHERE name ILIKE 'Victor Leonardo%' LIMIT 1
)
UPDATE public.processes p
   SET status = 'acompanhamento', status_label = 'Em acompanhamento', updated_at = now()
  FROM victor
 WHERE p.client_id = victor.id
   AND p.code = 'CC 24-016';

-- Verify before COMMIT:
--   SELECT code, status, status_label FROM public.processes
--    WHERE client_id = (SELECT id FROM public.clients WHERE name ILIKE 'Victor Leonardo%' LIMIT 1)
--    ORDER BY code;

COMMIT;
