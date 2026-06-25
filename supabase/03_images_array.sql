-- ============================================================
-- Bump checkins to support up to 10 images (was 3) via JSONB array.
-- Old image_1/2/3 columns kept for legacy reads.
-- Run in SQL Editor after 01_schema.sql + 02_rls.sql.
-- ============================================================

alter table public.checkins
  add column if not exists images jsonb default '[]'::jsonb;

-- Backfill: gather non-empty image_1/2/3 into the images array
update public.checkins
set images = to_jsonb(
  array_remove(array[
    nullif(image_1, ''),
    nullif(image_2, ''),
    nullif(image_3, '')
  ], null)
)
where coalesce(image_1, '') <> ''
   or coalesce(image_2, '') <> ''
   or coalesce(image_3, '') <> '';
