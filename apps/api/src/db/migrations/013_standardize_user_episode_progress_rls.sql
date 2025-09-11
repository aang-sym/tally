-- Migration 013a: Standardize RLS policies for user_episode_progress table

BEGIN;

-- Drop existing legacy policy
DROP POLICY IF EXISTS "Users can access their own episode progress" ON public.user_episode_progress;

-- Ensure RLS is enabled (should already be enabled)
ALTER TABLE public.user_episode_progress ENABLE ROW LEVEL SECURITY;

-- Create standardized SELECT policy
CREATE POLICY user_episode_progress_select_policy ON public.user_episode_progress
  FOR SELECT
  USING (user_id = auth.uid());

-- Create standardized INSERT policy
CREATE POLICY user_episode_progress_insert_policy ON public.user_episode_progress
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create standardized UPDATE policy
CREATE POLICY user_episode_progress_update_policy ON public.user_episode_progress
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create standardized DELETE policy
CREATE POLICY user_episode_progress_delete_policy ON public.user_episode_progress
  FOR DELETE
  USING (user_id = auth.uid());

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_episode_progress TO authenticated;

COMMIT;