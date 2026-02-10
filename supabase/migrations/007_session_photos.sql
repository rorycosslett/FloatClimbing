-- Session Photos (idempotent)
-- Adds photo_url column to sessions and creates storage bucket for session photos

-- Add photo_url column to sessions table
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create the session-photos storage bucket (public so images can be loaded without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-photos', 'session-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (drop-if-exists + create for idempotency)
DROP POLICY IF EXISTS "Session photos are publicly accessible" ON storage.objects;
CREATE POLICY "Session photos are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'session-photos');

DROP POLICY IF EXISTS "Users can upload their own session photos" ON storage.objects;
CREATE POLICY "Users can upload their own session photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'session-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update their own session photos" ON storage.objects;
CREATE POLICY "Users can update their own session photos"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'session-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'session-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete their own session photos" ON storage.objects;
CREATE POLICY "Users can delete their own session photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'session-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
