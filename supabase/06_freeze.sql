-- ============================================================
-- Freeze users: blocks insert on checkins / comments / likes
-- Frozen users can still log in and read (audit / reflection).
-- Run AFTER 05_fix_rls_recursion.sql
-- ============================================================

alter table public.profiles add column if not exists frozen boolean default false;

-- SECURITY DEFINER so the insert policies can check without RLS recursion
create or replace function public.is_frozen_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce((select frozen from public.profiles where id = auth.uid()), false);
$$;

-- Replace insert policies to also require not-frozen
drop policy if exists "checkins: insert own" on public.checkins;
create policy "checkins: insert own" on public.checkins for insert
  with check (auth.uid() = user_id and not public.is_frozen_user());

drop policy if exists "comments: insert authed" on public.comments;
create policy "comments: insert authed" on public.comments for insert
  with check (auth.uid() = user_id and not public.is_frozen_user());

drop policy if exists "likes: insert own" on public.likes;
create policy "likes: insert own" on public.likes for insert
  with check (auth.uid() = user_id and not public.is_frozen_user());
