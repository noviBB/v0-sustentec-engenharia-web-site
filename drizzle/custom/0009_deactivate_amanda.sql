-- Issue #34 follow-up — deactivate Amanda.
--
-- Migration 0008 upserts `amanda` as active (it was provisionally one of the 8
-- responsáveis). The decision after review: CC 24-044 is reassigned to Leon and
-- Amanda is dropped from the canonical set (issue #34 item 8 lists 7). She is
-- kept as a row (never deleted — processes may FK her) but inactive, so the
-- appointment dropdown shows exactly the 7 active responsáveis.
--
-- Forward-only and after 0008 (which is SHA-locked once applied). Idempotent.

UPDATE public.responsible_techs SET active = false WHERE slug = 'amanda';
