-- Add responsible_tech_id to appointments and enforce uniqueness on (tech, slot)
-- for non-cancelled rows. Surfaces double-booking as Postgres error 23505 to
-- the application layer (see lib/db/appointments.ts).

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS responsible_tech_id uuid
    REFERENCES public.responsible_techs(id) ON DELETE SET NULL;

-- note: switch to CREATE UNIQUE INDEX CONCURRENTLY once the table has rows in production
-- (currently safe because the table is empty)
CREATE UNIQUE INDEX IF NOT EXISTS appointments_tech_slot_uniq
  ON public.appointments (responsible_tech_id, starts_at)
  WHERE status <> 'cancelada' AND responsible_tech_id IS NOT NULL;
