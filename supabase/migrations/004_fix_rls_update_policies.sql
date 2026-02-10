-- Fix RLS update policies to include WITH CHECK clause
-- This is required for upsert operations to work correctly
-- The USING clause checks existing rows, WITH CHECK validates new data

-- ============================================
-- FIX SESSIONS UPDATE POLICY
-- ============================================

DROP POLICY IF EXISTS "Users can update own sessions" ON public.sessions;

CREATE POLICY "Users can update own sessions"
  ON public.sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FIX CLIMBS UPDATE POLICY
-- ============================================

DROP POLICY IF EXISTS "Users can update own climbs" ON public.climbs;

CREATE POLICY "Users can update own climbs"
  ON public.climbs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- FIX USER_SETTINGS UPDATE POLICY
-- ============================================

DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;

CREATE POLICY "Users can update own settings"
  ON public.user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
