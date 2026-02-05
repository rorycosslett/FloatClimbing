-- Float Climbing Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/YOUR_PROJECT/sql

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Stores user profile information, linked to Supabase Auth

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text,
  avatar_url text,
  is_public boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- SESSIONS TABLE
-- ============================================
-- Stores climbing sessions

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  start_time timestamptz not null,
  end_time timestamptz,
  name text,
  paused_duration bigint default 0, -- milliseconds
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index sessions_user_id_idx on public.sessions(user_id);
create index sessions_start_time_idx on public.sessions(start_time desc);

-- ============================================
-- CLIMBS TABLE
-- ============================================
-- Stores individual climb attempts/sends

create type public.climb_type as enum ('boulder', 'sport', 'trad');
create type public.climb_status as enum ('send', 'attempt');

create table public.climbs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  session_id uuid references public.sessions(id) on delete cascade not null,
  grade text not null,
  type public.climb_type not null,
  status public.climb_status not null,
  timestamp timestamptz not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index climbs_user_id_idx on public.climbs(user_id);
create index climbs_session_id_idx on public.climbs(session_id);
create index climbs_timestamp_idx on public.climbs(timestamp desc);

-- ============================================
-- USER SETTINGS TABLE
-- ============================================
-- Stores user preferences (grade systems, etc.)

create table public.user_settings (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  boulder_grade_system text default 'vscale' not null,
  route_grade_system text default 'yds' not null,
  updated_at timestamptz default now() not null
);

-- Auto-create settings when profile is created
create or replace function public.handle_new_profile()
returns trigger as $$
begin
  insert into public.user_settings (user_id)
  values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
  after insert on public.profiles
  for each row execute procedure public.handle_new_profile();

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
-- Automatically update updated_at timestamp

create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at_column();

create trigger update_sessions_updated_at
  before update on public.sessions
  for each row execute procedure public.update_updated_at_column();

create trigger update_climbs_updated_at
  before update on public.climbs
  for each row execute procedure public.update_updated_at_column();

create trigger update_user_settings_updated_at
  before update on public.user_settings
  for each row execute procedure public.update_updated_at_column();
