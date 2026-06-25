-- ============================================================
-- Fix infinite RLS recursion on profiles.
--
-- Bug: "profiles: admin all" did `exists(select 1 from public.profiles
-- where id = auth.uid() and is_admin)`. That subquery itself is subject
-- to the same policy → recursion → Postgres aborts with 42P17.
--
-- Fix: encapsulate the admin lookup in a SECURITY DEFINER function so
-- it runs as the function owner and bypasses RLS. Then rewrite every
-- policy that checks "am I admin" to call the function.
--
-- Run in Supabase Studio → SQL Editor → New query.
-- ============================================================

create or replace function public.is_admin_user() returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Drop the recursive policies + the ones that referenced profiles inline.
drop policy if exists "profiles: admin all"          on public.profiles;
drop policy if exists "checkins: delete own or admin" on public.checkins;
drop policy if exists "comments: delete own or admin" on public.comments;
drop policy if exists "settings: admin write"        on public.settings;

-- Re-create them using the function (no recursion: function bypasses RLS).
create policy "profiles: admin all" on public.profiles for all
  using (public.is_admin_user());

create policy "checkins: delete own or admin" on public.checkins for delete
  using (auth.uid() = user_id or public.is_admin_user());

create policy "comments: delete own or admin" on public.comments for delete
  using (auth.uid() = user_id or public.is_admin_user());

create policy "settings: admin write" on public.settings for all
  using (public.is_admin_user());
