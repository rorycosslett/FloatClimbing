-- ============================================
-- FEED LIKES TABLE
-- ============================================

CREATE TABLE public.feed_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id uuid REFERENCES public.activity_feed_items(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,

  UNIQUE(feed_item_id, user_id)
);

CREATE INDEX feed_likes_feed_item_id_idx ON public.feed_likes(feed_item_id);
CREATE INDEX feed_likes_user_id_idx ON public.feed_likes(user_id);

-- ============================================
-- FEED COMMENTS TABLE
-- ============================================

CREATE TABLE public.feed_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feed_item_id uuid REFERENCES public.activity_feed_items(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 500),
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX feed_comments_feed_item_id_idx ON public.feed_comments(feed_item_id);
CREATE INDEX feed_comments_created_at_idx ON public.feed_comments(created_at);

-- ============================================
-- DENORMALIZED COUNTS ON ACTIVITY_FEED_ITEMS
-- ============================================

ALTER TABLE public.activity_feed_items
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0;

-- ============================================
-- TRIGGER: KEEP LIKE COUNT IN SYNC
-- ============================================

CREATE OR REPLACE FUNCTION public.update_feed_like_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.activity_feed_items
      SET like_count = like_count + 1
      WHERE id = NEW.feed_item_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.activity_feed_items
      SET like_count = like_count - 1
      WHERE id = OLD.feed_item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER feed_likes_count_trigger
  AFTER INSERT OR DELETE ON public.feed_likes
  FOR EACH ROW EXECUTE PROCEDURE public.update_feed_like_count();

-- ============================================
-- TRIGGER: KEEP COMMENT COUNT IN SYNC
-- ============================================

CREATE OR REPLACE FUNCTION public.update_feed_comment_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.activity_feed_items
      SET comment_count = comment_count + 1
      WHERE id = NEW.feed_item_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.activity_feed_items
      SET comment_count = comment_count - 1
      WHERE id = OLD.feed_item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER feed_comments_count_trigger
  AFTER INSERT OR DELETE ON public.feed_comments
  FOR EACH ROW EXECUTE PROCEDURE public.update_feed_comment_count();

-- ============================================
-- RLS: FEED LIKES
-- ============================================

ALTER TABLE public.feed_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view likes on own items"
  ON public.feed_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_feed_items afi
      WHERE afi.id = feed_likes.feed_item_id
        AND afi.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view likes on followed users items"
  ON public.feed_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_feed_items afi
      JOIN public.follows f ON f.following_id = afi.user_id
      JOIN public.profiles p ON p.id = afi.user_id
      WHERE afi.id = feed_likes.feed_item_id
        AND f.follower_id = auth.uid()
        AND p.is_public = true
    )
  );

CREATE POLICY "Users can view own likes"
  ON public.feed_likes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own likes"
  ON public.feed_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON public.feed_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS: FEED COMMENTS
-- ============================================

ALTER TABLE public.feed_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on own items"
  ON public.feed_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_feed_items afi
      WHERE afi.id = feed_comments.feed_item_id
        AND afi.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view comments on followed users items"
  ON public.feed_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_feed_items afi
      JOIN public.follows f ON f.following_id = afi.user_id
      JOIN public.profiles p ON p.id = afi.user_id
      WHERE afi.id = feed_comments.feed_item_id
        AND f.follower_id = auth.uid()
        AND p.is_public = true
    )
  );

CREATE POLICY "Users can view own comments"
  ON public.feed_comments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own comments"
  ON public.feed_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.feed_comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RPC: BATCH CHECK LIKED STATUS
-- ============================================

CREATE OR REPLACE FUNCTION public.get_liked_feed_item_ids(item_ids uuid[])
RETURNS SETOF uuid AS $$
  SELECT feed_item_id
  FROM public.feed_likes
  WHERE user_id = auth.uid()
    AND feed_item_id = ANY(item_ids);
$$ LANGUAGE sql SECURITY DEFINER;
