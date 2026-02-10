-- Session Privacy
-- Adds per-session privacy control (public/private)

-- Add is_public column to sessions, defaulting to true (existing sessions remain public)
ALTER TABLE public.sessions ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true;

-- Update the RLS policy so followers only see public sessions
DROP POLICY IF EXISTS "Users can view followed users sessions" ON public.sessions;
CREATE POLICY "Users can view followed users sessions"
  ON public.sessions FOR SELECT
  USING (
    sessions.is_public = true
    AND exists (
      select 1 from public.follows f
      join public.profiles p on f.following_id = p.id
      where f.follower_id = auth.uid()
        and f.following_id = sessions.user_id
        and p.is_public = true
    )
  );
