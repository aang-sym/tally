-- Step 3 Migration: Normalize RLS & Policies for user_shows table

BEGIN;

-- Drop existing duplicate or redundant policies
DROP POLICY IF EXISTS "user_shows_select_policy" ON public.user_shows;
DROP POLICY IF EXISTS "user_shows_insert_policy" ON public.user_shows;
DROP POLICY IF EXISTS "user_shows_update_policy" ON public.user_shows;
DROP POLICY IF EXISTS "user_shows_delete_policy" ON public.user_shows;

-- Enable Row-Level Security on user_shows table
ALTER TABLE public.user_shows ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy allowing users to select only their own rows
CREATE POLICY user_shows_select_policy ON public.user_shows
  FOR SELECT
  USING (user_id = auth.uid());

-- Create INSERT policy allowing users to insert rows only for themselves
CREATE POLICY user_shows_insert_policy ON public.user_shows
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create UPDATE policy allowing users to update only their own rows
CREATE POLICY user_shows_update_policy ON public.user_shows
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create DELETE policy allowing users to delete only their own rows
CREATE POLICY user_shows_delete_policy ON public.user_shows
  FOR DELETE
  USING (user_id = auth.uid());

-- Grant SELECT permissions on key columns to authenticated users
GRANT SELECT (id, user_id, show_id) ON public.user_shows TO authenticated;

COMMIT;