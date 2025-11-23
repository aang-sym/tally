-- Migration 013b: Standardize RLS policies for user_season_ratings table

BEGIN;

-- Drop existing legacy policy
DROP POLICY IF EXISTS "Users can access their own season ratings" ON public.user_season_ratings;

-- Ensure RLS is enabled (should already be enabled)
ALTER TABLE public.user_season_ratings ENABLE ROW LEVEL SECURITY;

-- Create standardized SELECT policy
CREATE POLICY user_season_ratings_select_policy ON public.user_season_ratings
  FOR SELECT
  USING (user_id = auth.uid());

-- Create standardized INSERT policy
CREATE POLICY user_season_ratings_insert_policy ON public.user_season_ratings
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create standardized UPDATE policy
CREATE POLICY user_season_ratings_update_policy ON public.user_season_ratings
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create standardized DELETE policy
CREATE POLICY user_season_ratings_delete_policy ON public.user_season_ratings
  FOR DELETE
  USING (user_id = auth.uid());

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_season_ratings TO authenticated;

COMMIT;