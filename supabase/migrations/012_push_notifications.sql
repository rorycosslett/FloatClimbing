-- ============================================
-- PUSH NOTIFICATION TOKENS TABLE
-- ============================================

CREATE TABLE public.notification_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  expo_push_token text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(user_id, expo_push_token)
);

CREATE INDEX notification_tokens_user_id_idx ON public.notification_tokens(user_id);

-- ============================================
-- RLS: NOTIFICATION TOKENS
-- ============================================

ALTER TABLE public.notification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens"
  ON public.notification_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens"
  ON public.notification_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens"
  ON public.notification_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens"
  ON public.notification_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- ENABLE PG_NET EXTENSION
-- (Also enable in Supabase Dashboard > Database > Extensions)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================
-- STORE SERVICE ROLE KEY IN VAULT
-- Run this separately after creating the migration:
--
--   SELECT vault.create_secret(
--     '<YOUR_SERVICE_ROLE_KEY>',
--     'service_role_key',
--     'Service role key for Edge Function calls'
--   );
--
-- ============================================

-- Helper to read the service role key from vault
CREATE OR REPLACE FUNCTION public.get_service_role_key()
RETURNS text AS $$
  SELECT decrypted_secret
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================
-- NOTIFICATION TRIGGER: NEW FOLLOW
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS trigger AS $$
DECLARE
  actor_name text;
  service_key text;
BEGIN
  -- Don't notify on self-follow (shouldn't happen due to CHECK constraint)
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NEW;
  END IF;

  -- Get actor display name
  SELECT display_name INTO actor_name
    FROM public.profiles WHERE id = NEW.follower_id;

  -- Get service role key from vault
  service_key := public.get_service_role_key();

  -- Call send-notification Edge Function via pg_net
  PERFORM net.http_post(
    url := 'https://jdnlawryuxlsabwhasqc.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'type', 'follow',
      'target_user_id', NEW.following_id,
      'actor_user_id', NEW.follower_id,
      'actor_name', COALESCE(actor_name, 'Someone')
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_follow
  AFTER INSERT ON public.follows
  FOR EACH ROW EXECUTE PROCEDURE public.notify_on_follow();

-- ============================================
-- NOTIFICATION TRIGGER: NEW LIKE
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger AS $$
DECLARE
  actor_name text;
  target_user uuid;
  service_key text;
BEGIN
  -- Get the owner of the feed item
  SELECT user_id INTO target_user
    FROM public.activity_feed_items WHERE id = NEW.feed_item_id;

  -- Don't notify if liking own post
  IF NEW.user_id = target_user THEN
    RETURN NEW;
  END IF;

  -- Get actor display name
  SELECT display_name INTO actor_name
    FROM public.profiles WHERE id = NEW.user_id;

  -- Get service role key from vault
  service_key := public.get_service_role_key();

  PERFORM net.http_post(
    url := 'https://jdnlawryuxlsabwhasqc.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'type', 'like',
      'target_user_id', target_user,
      'actor_user_id', NEW.user_id,
      'actor_name', COALESCE(actor_name, 'Someone'),
      'feed_item_id', NEW.feed_item_id
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_like
  AFTER INSERT ON public.feed_likes
  FOR EACH ROW EXECUTE PROCEDURE public.notify_on_like();

-- ============================================
-- NOTIFICATION TRIGGER: NEW COMMENT
-- ============================================

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS trigger AS $$
DECLARE
  actor_name text;
  target_user uuid;
  comment_preview text;
  service_key text;
BEGIN
  -- Get the owner of the feed item
  SELECT user_id INTO target_user
    FROM public.activity_feed_items WHERE id = NEW.feed_item_id;

  -- Don't notify if commenting on own post
  IF NEW.user_id = target_user THEN
    RETURN NEW;
  END IF;

  -- Get actor display name
  SELECT display_name INTO actor_name
    FROM public.profiles WHERE id = NEW.user_id;

  -- Truncate comment for notification preview
  comment_preview := LEFT(NEW.content, 100);

  -- Get service role key from vault
  service_key := public.get_service_role_key();

  PERFORM net.http_post(
    url := 'https://jdnlawryuxlsabwhasqc.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'type', 'comment',
      'target_user_id', target_user,
      'actor_user_id', NEW.user_id,
      'actor_name', COALESCE(actor_name, 'Someone'),
      'feed_item_id', NEW.feed_item_id,
      'comment_preview', comment_preview
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.feed_comments
  FOR EACH ROW EXECUTE PROCEDURE public.notify_on_comment();
