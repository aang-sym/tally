-- Fix RLS policies to allow service role operations
-- The service role should bypass RLS entirely, but if that's not working,
-- we need to adjust policies to allow service operations

-- =================
-- SHOWS TABLE - Allow service role operations
-- =================

DROP POLICY IF EXISTS "Authenticated can manage shows" ON shows;

-- Allow service role and authenticated users to manage shows
CREATE POLICY "Service and authenticated can manage shows" ON shows
  FOR ALL 
  USING (auth.uid() IS NOT NULL OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- =================
-- SEASONS TABLE - Allow service role operations
-- =================

DROP POLICY IF EXISTS "Authenticated can manage seasons" ON seasons;

-- Allow service role and authenticated users to manage seasons
CREATE POLICY "Service and authenticated can manage seasons" ON seasons
  FOR ALL 
  USING (auth.uid() IS NOT NULL OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- =================
-- EPISODES TABLE - Allow service role operations
-- =================

DROP POLICY IF EXISTS "Authenticated can manage episodes" ON episodes;

-- Allow service role and authenticated users to manage episodes
CREATE POLICY "Service and authenticated can manage episodes" ON episodes
  FOR ALL 
  USING (auth.uid() IS NOT NULL OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() IS NOT NULL OR auth.role() = 'service_role');

-- Verify the policies are updated
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('shows', 'seasons', 'episodes')
ORDER BY tablename, policyname;