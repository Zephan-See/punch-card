-- ============================================================
-- feed_v: pre-joined checkins + profiles + comment_count + is_liked.
-- The frontend used to do nested joins and filter likes client-side,
-- which was O(likes) per checkin. With this view, Postgres computes
-- is_liked via an indexed subquery and we get ONE flat row per checkin.
-- ============================================================

create or replace view public.feed_v as
select
  c.id,
  c.user_id,
  c.content,
  c.checked_date,
  c.created_at,
  c.like_count,
  c.images,
  c.image_1,
  c.image_2,
  c.image_3,
  c.audio_url,
  c.video_url,
  p.name,
  p.avatar_url,
  p.signature,
  p.wall_public,
  (select count(*) from public.comments cm where cm.checkin_id = c.id) as comment_count,
  exists(
    select 1 from public.likes lk
    where lk.checkin_id = c.id and lk.user_id = auth.uid()
  ) as is_liked
from public.checkins c
join public.profiles p on p.id = c.user_id;

-- View inherits RLS from underlying tables (checkins: read public).
-- auth.uid() is evaluated per request, so is_liked is per-viewer.
