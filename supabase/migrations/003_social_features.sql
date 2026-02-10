-- Social Features Schema
-- Adds follows and activity feed functionality

-- ============================================
-- FOLLOWS TABLE
-- ============================================
-- Stores follow relationships between users

create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null,

  -- Prevent duplicate follows
  unique(follower_id, following_id),
  -- Prevent self-follows
  check (follower_id != following_id)
);

create index follows_follower_id_idx on public.follows(follower_id);
create index follows_following_id_idx on public.follows(following_id);

-- ============================================
-- ACTIVITY FEED ITEMS TABLE
-- ============================================
-- Denormalized table for efficient feed queries

create table public.activity_feed_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  activity_type text not null, -- 'session_completed'
  session_id uuid references public.sessions(id) on delete cascade,
  metadata jsonb default '{}' not null,
  created_at timestamptz default now() not null
);

create index activity_feed_user_id_idx on public.activity_feed_items(user_id);
create index activity_feed_created_at_idx on public.activity_feed_items(created_at desc);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

alter table public.follows enable row level security;
alter table public.activity_feed_items enable row level security;

-- ============================================
-- FOLLOWS POLICIES
-- ============================================

-- Users can view follows where they are involved
create policy "Users can view own follows"
  on public.follows for select
  using (auth.uid() = follower_id or auth.uid() = following_id);

-- Users can insert their own follows
create policy "Users can insert own follows"
  on public.follows for insert
  with check (auth.uid() = follower_id);

-- Users can delete their own follows
create policy "Users can delete own follows"
  on public.follows for delete
  using (auth.uid() = follower_id);

-- ============================================
-- ACTIVITY FEED POLICIES
-- ============================================

-- Users can view their own activity
create policy "Users can view own activity"
  on public.activity_feed_items for select
  using (auth.uid() = user_id);

-- Users can view activity from public profiles they follow
create policy "Users can view followed users activity"
  on public.activity_feed_items for select
  using (
    exists (
      select 1 from public.follows f
      join public.profiles p on f.following_id = p.id
      where f.follower_id = auth.uid()
        and f.following_id = activity_feed_items.user_id
        and p.is_public = true
    )
  );

-- Users can insert their own activity
create policy "Users can insert own activity"
  on public.activity_feed_items for insert
  with check (auth.uid() = user_id);

-- Users can delete their own activity
create policy "Users can delete own activity"
  on public.activity_feed_items for delete
  using (auth.uid() = user_id);

-- ============================================
-- SESSIONS POLICY FOR FOLLOWED USERS
-- ============================================

-- Users can view sessions from public profiles they follow
create policy "Users can view followed users sessions"
  on public.sessions for select
  using (
    exists (
      select 1 from public.follows f
      join public.profiles p on f.following_id = p.id
      where f.follower_id = auth.uid()
        and f.following_id = sessions.user_id
        and p.is_public = true
    )
  );

-- ============================================
-- CLIMBS POLICY FOR FOLLOWED USERS
-- ============================================

-- Users can view climbs from public profiles they follow
create policy "Users can view followed users climbs"
  on public.climbs for select
  using (
    exists (
      select 1 from public.follows f
      join public.profiles p on f.following_id = p.id
      where f.follower_id = auth.uid()
        and f.following_id = climbs.user_id
        and p.is_public = true
    )
  );

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get follower count for a user
create or replace function public.get_follower_count(profile_id uuid)
returns bigint as $$
  select count(*) from public.follows where following_id = profile_id;
$$ language sql security definer;

-- Function to get following count for a user
create or replace function public.get_following_count(profile_id uuid)
returns bigint as $$
  select count(*) from public.follows where follower_id = profile_id;
$$ language sql security definer;

-- Function to check if current user follows another user
create or replace function public.is_following(target_id uuid)
returns boolean as $$
  select exists(
    select 1 from public.follows
    where follower_id = auth.uid() and following_id = target_id
  );
$$ language sql security definer;
