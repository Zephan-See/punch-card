-- ============================================================
-- Soft-hide checkins. Admin can hide a post; only owner + admin can
-- still see it (with a "hidden" badge in UI). Owner cannot share it.
-- Run AFTER 06_freeze.sql
-- ============================================================

alter table public.checkins add column if not exists hidden_at timestamptz;

-- Read policy: anyone sees own posts (incl. hidden); admin sees all;
-- everyone else only sees non-hidden public-wall posts.
drop policy if exists "checkins: read public" on public.checkins;
create policy "checkins: read public" on public.checkins for select using (
  auth.uid() = user_id
  or public.is_admin_user()
  or (
    hidden_at is null
    and exists(select 1 from public.profiles p where p.id = user_id and p.wall_public)
  )
);

-- Rebuild feed_v to expose hidden_at to the frontend.
-- DROP first because CREATE OR REPLACE can't change column order.
drop view if exists public.feed_v;
create view public.feed_v as
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
  c.hidden_at,
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
