-- ============================
-- profiles 表（用户档案）
-- ============================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text not null,
  display_name text,
  avatar_url text,
  phone text,
  bio text,
  invite_code text unique,
  invite_count integer default 0,
  free_api_quota integer default 0,
  created_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone" on public.profiles for select using (true);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- ============================
-- friends 表（好友关系）
-- ============================
create table if not exists public.friends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  friend_username text not null,
  friend_display_name text,
  friend_avatar_url text,
  status text not null default 'offline',
  created_at timestamp with time zone default now(),
  unique(user_id, friend_id)
);

alter table public.friends enable row level security;

drop policy if exists "Users can view own friends" on public.friends;
create policy "Users can view own friends" on public.friends for select using (auth.uid() = user_id);

drop policy if exists "Users can add friends" on public.friends;
create policy "Users can add friends" on public.friends for insert with check (auth.uid() = user_id);

drop policy if exists "Users can remove own friends" on public.friends;
create policy "Users can remove own friends" on public.friends for delete using (auth.uid() = user_id);

-- ============================
-- 触发器：用户注册时自动创建 profile
-- ============================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, email, display_name, invite_code)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.email,
    new.raw_user_meta_data->>'display_name',
    substr(new.id::text, 1, 8)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================
-- journal_entries 表（行程记录云端同步）
-- ============================
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id text not null,
  title text not null,
  category text not null,
  start_time text not null,
  end_time text not null,
  location_name text,
  location_address text,
  location_lat numeric,
  location_lng numeric,
  description text default '',
  cost numeric default 0,
  photo_ids jsonb default '[]'::jsonb,
  source text default 'manual',
  status text default 'planned',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, entry_id)
);

alter table public.journal_entries enable row level security;

drop policy if exists "Users can view own entries" on public.journal_entries;
create policy "Users can view own entries" on public.journal_entries for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own entries" on public.journal_entries;
create policy "Users can insert own entries" on public.journal_entries for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own entries" on public.journal_entries;
create policy "Users can update own entries" on public.journal_entries for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own entries" on public.journal_entries;
create policy "Users can delete own entries" on public.journal_entries for delete using (auth.uid() = user_id);

-- ============================
-- albums 表（相册云端同步）
-- ============================
create table if not exists public.albums (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  album_id text not null,
  name text not null,
  photo_ids jsonb default '[]'::jsonb,
  created_at bigint,
  unique(user_id, album_id)
);

alter table public.albums enable row level security;

drop policy if exists "Users can view own albums" on public.albums;
create policy "Users can view own albums" on public.albums for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own albums" on public.albums;
create policy "Users can insert own albums" on public.albums for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own albums" on public.albums;
create policy "Users can update own albums" on public.albums for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own albums" on public.albums;
create policy "Users can delete own albums" on public.albums for delete using (auth.uid() = user_id);

-- ============================
-- Storage: journal-photos bucket
-- ============================
insert into storage.buckets (id, name, public) values ('journal-photos', 'journal-photos', false)
on conflict (id) do nothing;

drop policy if exists "Users can view own photos" on storage.objects;
create policy "Users can view own photos" on storage.objects for select
using (bucket_id = 'journal-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can upload own photos" on storage.objects;
create policy "Users can upload own photos" on storage.objects for insert
with check (bucket_id = 'journal-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Users can delete own photos" on storage.objects;
create policy "Users can delete own photos" on storage.objects for delete
using (bucket_id = 'journal-photos' and auth.uid()::text = (storage.foldername(name))[1]);
