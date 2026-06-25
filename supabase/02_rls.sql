-- ============================================================
-- Row-Level Security policies
-- Run AFTER 01_schema.sql
-- ============================================================

alter table public.profiles enable row level security;
alter table public.checkins enable row level security;
alter table public.likes    enable row level security;
alter table public.comments enable row level security;
alter table public.settings enable row level security;
alter table public.goals    enable row level security;

-- =========== profiles ===========
create policy "profiles: read all"    on public.profiles for select using (true);
create policy "profiles: update own"  on public.profiles for update using (auth.uid() = id);
create policy "profiles: insert self" on public.profiles for insert with check (auth.uid() = id);
-- Admin can update anyone (e.g., set is_admin flag)
create policy "profiles: admin all"   on public.profiles for all
  using (exists(select 1 from public.profiles p where p.id = auth.uid() and p.is_admin));

-- =========== checkins ===========
-- Read: public wall OR own
create policy "checkins: read public" on public.checkins for select using (
  exists(select 1 from public.profiles p where p.id = user_id and (p.wall_public or auth.uid() = user_id))
);
create policy "checkins: insert own"  on public.checkins for insert with check (auth.uid() = user_id);
create policy "checkins: update own"  on public.checkins for update using (auth.uid() = user_id);
create policy "checkins: delete own or admin" on public.checkins for delete using (
  auth.uid() = user_id
  or exists(select 1 from public.profiles where id = auth.uid() and is_admin)
);

-- =========== likes ===========
create policy "likes: read all"    on public.likes for select using (true);
create policy "likes: insert own"  on public.likes for insert with check (auth.uid() = user_id);
create policy "likes: delete own"  on public.likes for delete using (auth.uid() = user_id);

-- =========== comments ===========
create policy "comments: read all" on public.comments for select using (true);
create policy "comments: insert authed" on public.comments for insert with check (auth.uid() = user_id);
create policy "comments: delete own or admin" on public.comments for delete using (
  auth.uid() = user_id
  or exists(select 1 from public.profiles where id = auth.uid() and is_admin)
);

-- =========== settings ===========
create policy "settings: read all"  on public.settings for select using (true);
create policy "settings: admin write" on public.settings for all
  using (exists(select 1 from public.profiles where id = auth.uid() and is_admin));

-- =========== goals ===========
create policy "goals: own"   on public.goals for all using (auth.uid() = user_id);

-- =========== Storage bucket =============================================
-- Run from Supabase Studio → Storage → New bucket (UI is easier than SQL).
-- Bucket: name="media", public=ON. Then run policies below.
-- Path convention: media/<user_id>/<checkin_id>/<filename>

create policy "media: upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "media: read public"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "media: delete own"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
