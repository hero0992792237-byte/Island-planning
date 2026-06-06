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
