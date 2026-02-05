-- Row Level Security Policies
-- Users can only access their own data

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.climbs enable row level security;
alter table public.user_settings enable row level security;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Public profiles can be viewed by anyone (for social features)
create policy "Public profiles are viewable"
  on public.profiles for select
  using (is_public = true);

-- ============================================
-- SESSIONS POLICIES
-- ============================================

-- Users can view their own sessions
create policy "Users can view own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

-- Users can insert their own sessions
create policy "Users can insert own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

-- Users can update their own sessions
create policy "Users can update own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

-- Users can delete their own sessions
create policy "Users can delete own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);

-- ============================================
-- CLIMBS POLICIES
-- ============================================

-- Users can view their own climbs
create policy "Users can view own climbs"
  on public.climbs for select
  using (auth.uid() = user_id);

-- Users can insert their own climbs
create policy "Users can insert own climbs"
  on public.climbs for insert
  with check (auth.uid() = user_id);

-- Users can update their own climbs
create policy "Users can update own climbs"
  on public.climbs for update
  using (auth.uid() = user_id);

-- Users can delete their own climbs
create policy "Users can delete own climbs"
  on public.climbs for delete
  using (auth.uid() = user_id);

-- ============================================
-- USER SETTINGS POLICIES
-- ============================================

-- Users can view their own settings
create policy "Users can view own settings"
  on public.user_settings for select
  using (auth.uid() = user_id);

-- Users can update their own settings
create policy "Users can update own settings"
  on public.user_settings for update
  using (auth.uid() = user_id);
