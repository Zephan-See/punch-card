-- ============================================================
-- 打卡小程序 · Supabase schema
-- Run this in Supabase Studio → SQL Editor → New query
-- ============================================================

-- ============= TABLES =============

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text default '',
  signature text default '',
  wall_public boolean default true,
  is_admin boolean default false,
  created_at timestamptz default now()
);

create table public.checkins (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  checked_date date not null,
  image_1 text default '',
  image_2 text default '',
  image_3 text default '',
  audio_url text default '',
  video_url text default '',
  like_count int default 0,
  created_at timestamptz default now(),
  unique (user_id, checked_date)
);
create index on public.checkins (user_id, created_at desc);
create index on public.checkins (created_at desc);
create index on public.checkins (checked_date);

create table public.likes (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_id bigint not null references public.checkins(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_id, checkin_id)
);
create index on public.likes (checkin_id);

create table public.comments (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  checkin_id bigint not null references public.checkins(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);
create index on public.comments (checkin_id, created_at);

create table public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);
insert into public.settings (key, value) values ('activity_name', '100人100天打卡活动');

create table public.goals (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  target_days int default 100,
  active boolean default true,
  created_at timestamptz default now()
);
create index on public.goals (user_id);

-- ============= TRIGGERS =============

-- Auto-create profile on signup (reads name from raw_user_meta_data)
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep checkins.like_count in sync with likes table
create or replace function public.update_like_count() returns trigger as $$
begin
  if (tg_op = 'INSERT') then
    update public.checkins set like_count = like_count + 1 where id = new.checkin_id;
  elsif (tg_op = 'DELETE') then
    update public.checkins set like_count = greatest(0, like_count - 1) where id = old.checkin_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists likes_count_trigger on public.likes;
create trigger likes_count_trigger
  after insert or delete on public.likes
  for each row execute function public.update_like_count();

-- ============= VIEWS / RPCS =============

-- Leaderboard: unique checkin days per user (distinct dates)
create or replace view public.leaderboard_v as
  select
    p.id,
    p.name,
    p.avatar_url,
    p.signature,
    p.wall_public,
    count(distinct c.checked_date) as total_days
  from public.profiles p
  left join public.checkins c on c.user_id = p.id
  group by p.id;

-- Admin stats RPC
create or replace function public.admin_stats() returns json as $$
declare
  result json;
begin
  if not exists(select 1 from public.profiles where id = auth.uid() and is_admin) then
    raise exception '无权限';
  end if;
  select json_build_object(
    'totalUsers', (select count(*) from public.profiles),
    'totalCheckins', (select count(*) from public.checkins),
    'totalLikes', (select count(*) from public.likes),
    'totalComments', (select count(*) from public.comments),
    'todayCheckins', (select count(*) from public.checkins where checked_date = current_date),
    'recent7DaysCheckins', (select count(*) from public.checkins where checked_date >= current_date - 6),
    'dailyTrend', (
      select json_agg(json_build_object('date', d::date, 'count', coalesce(cnt, 0)) order by d)
      from generate_series(current_date - 6, current_date, '1 day') d
      left join (
        select checked_date, count(*) as cnt
        from public.checkins
        where checked_date >= current_date - 6
        group by checked_date
      ) c on c.checked_date = d
    )
  ) into result;
  return result;
end;
$$ language plpgsql security definer;
