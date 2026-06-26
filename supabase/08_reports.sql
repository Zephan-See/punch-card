-- ============================================================
-- User-submitted reports for moderation. Run AFTER 07_hide_checkin.sql
-- ============================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  checkin_id bigint references public.checkins(id) on delete cascade,
  reporter_id uuid references auth.users(id) on delete set null,
  reason text not null default '',
  status text not null default 'pending',  -- pending | resolved
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create index if not exists reports_status_created_idx
  on public.reports(status, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "reports: insert authed" on public.reports;
create policy "reports: insert authed" on public.reports for insert
  with check (auth.uid() = reporter_id);

drop policy if exists "reports: read own or admin" on public.reports;
create policy "reports: read own or admin" on public.reports for select
  using (auth.uid() = reporter_id or public.is_admin_user());

drop policy if exists "reports: admin update" on public.reports;
create policy "reports: admin update" on public.reports for update
  using (public.is_admin_user());
