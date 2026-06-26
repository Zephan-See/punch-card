-- ============================================================
-- Admin audit log — every moderation action leaves a trace.
-- Run AFTER 08_reports.sql
-- ============================================================

create table if not exists public.audit_log (
  id bigserial primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,           -- delete_user | delete_checkin | hide_checkin | unhide_checkin | freeze_user | unfreeze_user | resolve_report | update_settings
  target_type text,               -- user | checkin | report | settings
  target_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists audit_log_created_idx on public.audit_log(created_at desc);

alter table public.audit_log enable row level security;

drop policy if exists "audit: admin insert" on public.audit_log;
create policy "audit: admin insert" on public.audit_log for insert
  with check (public.is_admin_user());

drop policy if exists "audit: admin read" on public.audit_log;
create policy "audit: admin read" on public.audit_log for select
  using (public.is_admin_user());
