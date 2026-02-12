-- Strava Activity ID tracking (idempotent)
-- Stores the Strava activity ID returned when a session is posted to Strava

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS strava_activity_id bigint;
