-- Migration 013c: Enable RLS and create policies for user_streaming_subscriptions table

BEGIN;

-- Enable Row-Level Security on user_streaming_subscriptions table
ALTER TABLE public.user_streaming_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create standardized SELECT policy
CREATE POLICY user_streaming_subscriptions_select_policy ON public.user_streaming_subscriptions
  FOR SELECT
  USING (user_id = auth.uid());

-- Create standardized INSERT policy
CREATE POLICY user_streaming_subscriptions_insert_policy ON public.user_streaming_subscriptions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create standardized UPDATE policy
CREATE POLICY user_streaming_subscriptions_update_policy ON public.user_streaming_subscriptions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create standardized DELETE policy
CREATE POLICY user_streaming_subscriptions_delete_policy ON public.user_streaming_subscriptions
  FOR DELETE
  USING (user_id = auth.uid());

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_streaming_subscriptions TO authenticated;

COMMIT;