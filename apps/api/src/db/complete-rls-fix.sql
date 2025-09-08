-- Complete RLS Policy Fix for PGRST301 Error
-- This removes ALL problematic policies and creates clean, working policies

-- Step 1: Remove ALL existing policies on shows table
DROP POLICY IF EXISTS "Public can read shows" ON shows;
DROP POLICY IF EXISTS "Authenticated can delete shows" ON shows;
DROP POLICY IF EXISTS "Authenticated can update shows" ON shows;
DROP POLICY IF EXISTS "Authenticated can manage shows" ON shows;
DROP POLICY IF EXISTS "Service and authenticated can manage shows" ON shows;

-- Step 2: Create clean, working policies
-- Allow everyone to read shows (required for foreign key validation)
CREATE POLICY "Public can read shows" ON shows
  FOR SELECT 
  USING (true);

-- Allow authenticated users to insert shows
CREATE POLICY "Authenticated can insert shows" ON shows
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update shows
CREATE POLICY "Authenticated can update shows" ON shows
  FOR UPDATE 
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete shows
CREATE POLICY "Authenticated can delete shows" ON shows
  FOR DELETE 
  USING (auth.uid() IS NOT NULL);

-- Step 3: Verify the policies were created correctly
SELECT schemaname, tablename, policyname, cmd, permissive, qual
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'shows'
ORDER BY policyname;