-- Fix RLS policy for streaming_services to allow inserts

-- This policy allows any authenticated user (including the API)
-- to insert new rows into the streaming_services table.
CREATE POLICY "Allow authenticated users to insert new providers"
ON public.streaming_services
FOR INSERT
TO authenticated
WITH CHECK (true);
