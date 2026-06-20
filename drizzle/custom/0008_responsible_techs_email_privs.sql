-- Issue #34 — Responsáveis: email column privilege lock + active staff set.
--
-- The appointment dropdown lists only `active = true` responsible_techs. This
-- migration pins the canonical active set to the 8 current staff members and
-- flips every legacy slug to inactive (rows are kept, never deleted — existing
-- processes carry FKs to them).
--
-- It also locks the `email` column at the privilege layer so portal clients
-- (`authenticated`) can never SELECT staff emails: SELECT is revoked on the
-- whole table and re-granted column-by-column, omitting `email`. Staff/service
-- callers go through the service_role connection, which bypasses both RLS and
-- these grants.
--
-- SECURITY: no real email addresses live in git. This migration sets NO emails
-- at all (email stays NULL on every upserted row). Real staff emails AND
-- Victor's project data are applied to prod via a separate secured step that is
-- intentionally not committed.
--
-- Idempotent: REVOKE/GRANT and the upsert/UPDATE are all safe to re-run.

-- ---------------------------------------------------------------------------
-- 1) Column-level privilege lock — clients must not read `email`.
--    REVOKE the blanket SELECT (granted in 0005) then re-GRANT only the
--    non-sensitive columns. Re-running is a no-op.
-- ---------------------------------------------------------------------------
REVOKE SELECT ON public.responsible_techs FROM authenticated;
GRANT SELECT (id, slug, display_name, active, created_at, updated_at)
  ON public.responsible_techs TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Upsert the 8 active staff by slug. display_name + active are re-applied;
--    email is left untouched (NULL on insert; prod sets it via the secured
--    out-of-git step). ids are generated for inserts only.
-- ---------------------------------------------------------------------------
INSERT INTO public.responsible_techs (id, slug, display_name, active)
VALUES
  (gen_random_uuid(), 'amanda',       'Amanda',           true),
  (gen_random_uuid(), 'hilton',       'Hilton Fontenele', true),
  (gen_random_uuid(), 'ivon-benitez', 'Ivón O. Benítez',  true),
  (gen_random_uuid(), 'kely',         'Kely Figueira',    true),
  (gen_random_uuid(), 'laila',        'Laila Montel',     true),
  (gen_random_uuid(), 'leon',         'Leon Dalmasso',    true),
  (gen_random_uuid(), 'maira',        'Maíra Benedikt',   true),
  (gen_random_uuid(), 'marcelo',      'Marcelo Perello',  true)
ON CONFLICT (slug) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  active = true;

-- ---------------------------------------------------------------------------
-- 3) Every other tech becomes inactive (kept for existing process FKs).
-- ---------------------------------------------------------------------------
UPDATE public.responsible_techs
SET active = false
WHERE slug NOT IN (
  'amanda', 'hilton', 'ivon-benitez', 'kely', 'laila', 'leon', 'maira', 'marcelo'
);
